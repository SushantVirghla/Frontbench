import Papa from 'papaparse';
import { generateDataset, DATASET_COLUMNS } from '../lib/dataset-generator';
import { validateCSVStructure, inferColumnType } from '../lib/csv-validator';
import { computeAllStats } from '../lib/analytics';
import { baselineSearch, optimizedSearch, buildSearchIndex } from '../lib/search';
import type { DataRecord, ColumnSchema, ColumnStats } from '../types';

export type WorkerMessageIn =
  | { type: 'PARSE_CSV'; requestId: string; file: File; options?: { delimiter?: string } }
  | { type: 'GENERATE_DATASET'; requestId: string; seed: number; rowCount: number }
  | { type: 'COMPUTE_ANALYTICS'; requestId: string; records: DataRecord[]; columns: ColumnSchema[] }
  | { type: 'BENCHMARK_SEARCH'; requestId: string; records: DataRecord[]; query: string; variant: 'baseline' | 'optimized' }
  | { type: 'CANCEL'; requestId: string };

export type WorkerMessageOut =
  | { type: 'PROGRESS'; requestId: string; phase: string; percentage: number; rowsProcessed: number; totalRows?: number }
  | { type: 'PARSE_COMPLETE'; requestId: string; records: DataRecord[]; columns: ColumnSchema[]; durationMs: number }
  | { type: 'GENERATE_COMPLETE'; requestId: string; records: DataRecord[]; columns: ColumnSchema[]; durationMs: number }
  | { type: 'ANALYTICS_COMPLETE'; requestId: string; stats: ColumnStats[]; durationMs: number }
  | { type: 'SEARCH_COMPLETE'; requestId: string; resultCount: number; durationMs: number }
  | { type: 'ERROR'; requestId: string; error: string }
  | { type: 'CANCELLED'; requestId: string };

const cancelledRequests = new Set<string>();

self.onmessage = async (e: MessageEvent<WorkerMessageIn>) => {
  const msg = e.data;

  if (msg.type === 'CANCEL') {
    cancelledRequests.add(msg.requestId);
    self.postMessage({ type: 'CANCELLED', requestId: msg.requestId });
    return;
  }

  const startTime = performance.now();

  try {
    if (msg.type === 'GENERATE_DATASET') {
      const records = generateDataset(msg.seed, msg.rowCount);
      if (cancelledRequests.has(msg.requestId)) {
        cancelledRequests.delete(msg.requestId);
        return;
      }
      const durationMs = performance.now() - startTime;
      self.postMessage({
        type: 'GENERATE_COMPLETE',
        requestId: msg.requestId,
        records,
        columns: DATASET_COLUMNS,
        durationMs,
      });
      return;
    }

    if (msg.type === 'PARSE_CSV') {
      const records: DataRecord[] = [];
      let headers: string[] = [];
      let totalEstimated = 0;
      let lastProgressReport = performance.now();
      let rowIdx = 0;

      Papa.parse(msg.file, {
        header: true,
        skipEmptyLines: 'greedy',
        chunk: (results, parser) => {
          if (cancelledRequests.has(msg.requestId)) {
            cancelledRequests.delete(msg.requestId);
            parser.abort();
            return;
          }

          if (headers.length === 0 && results.meta.fields) {
            headers = results.meta.fields;
          }

          const MAX_SAFE_ROWS = 250000;
          const chunkRows = results.data as Record<string, unknown>[];
          for (let i = 0; i < chunkRows.length; i++) {
            rowIdx++;
            if (rowIdx > MAX_SAFE_ROWS) {
              parser.abort();
              self.postMessage({
                type: 'ERROR',
                requestId: msg.requestId,
                error: `File exceeded the safe browser limit of 250,000 rows. To prevent browser memory exhaustion and UI freezing, FrontBench supports up to 25 MB (~150,000–200,000 rows).`,
              });
              return;
            }
            const row = chunkRows[i];
            const record: DataRecord = {
              id: (row.id as string) || `ROW-${String(rowIdx).padStart(6, '0')}`,
              ...row,
            };
            records.push(record);
          }

          // Throttle progress to main thread: at most every 100ms
          const now = performance.now();
          if (now - lastProgressReport > 100) {
            lastProgressReport = now;
            self.postMessage({
              type: 'PROGRESS',
              requestId: msg.requestId,
              phase: 'parsing',
              percentage: totalEstimated > 0 ? Math.min(Math.round((rowIdx / totalEstimated) * 100), 99) : 50,
              rowsProcessed: rowIdx,
              totalRows: totalEstimated,
            });
          }
        },
        complete: () => {
          if (records.length === 0) {
            self.postMessage({
              type: 'ERROR',
              requestId: msg.requestId,
              error: 'The CSV file is empty or could not be parsed.',
            });
            return;
          }

          // Validate headers and structure on sample
          const sampleRows = records.slice(0, 100).map((r) => headers.map((h) => String(r[h] ?? '')));
          const valResult = validateCSVStructure(headers, sampleRows);
          if (!valResult.isValid) {
            self.postMessage({
              type: 'ERROR',
              requestId: msg.requestId,
              error: valResult.errors.join('; '),
            });
            return;
          }

          // Build inferred column schema
          const columns: ColumnSchema[] = headers.map((h) => {
            const values = records.slice(0, 200).map((r) => (r[h] != null ? String(r[h]) : null));
            return {
              name: h,
              type: inferColumnType(values),
              nullable: records.some((r) => r[h] == null || r[h] === ''),
            };
          });

          // Cast numeric and boolean values in records based on schema
          for (const col of columns) {
            if (col.type === 'number') {
              for (const r of records) {
                if (r[col.name] != null && r[col.name] !== '') {
                  const num = Number(r[col.name]);
                  if (!isNaN(num)) r[col.name] = num;
                }
              }
            } else if (col.type === 'boolean') {
              for (const r of records) {
                if (r[col.name] != null) {
                  r[col.name] = String(r[col.name]).toLowerCase() === 'true';
                }
              }
            }
          }

          const durationMs = performance.now() - startTime;
          self.postMessage({
            type: 'PARSE_COMPLETE',
            requestId: msg.requestId,
            records,
            columns,
            durationMs,
          });
        },
        error: (err) => {
          self.postMessage({
            type: 'ERROR',
            requestId: msg.requestId,
            error: `CSV parse error: ${err.message}`,
          });
        },
      });
      return;
    }

    if (msg.type === 'COMPUTE_ANALYTICS') {
      const stats = computeAllStats(msg.records, msg.columns);
      const durationMs = performance.now() - startTime;
      self.postMessage({
        type: 'ANALYTICS_COMPLETE',
        requestId: msg.requestId,
        stats,
        durationMs,
      });
      return;
    }

    if (msg.type === 'BENCHMARK_SEARCH') {
      let results: DataRecord[];
      if (msg.variant === 'optimized') {
        const index = buildSearchIndex(msg.records);
        results = optimizedSearch(msg.records, index, msg.query);
      } else {
        results = baselineSearch(msg.records, msg.query);
      }
      const durationMs = performance.now() - startTime;
      self.postMessage({
        type: 'SEARCH_COMPLETE',
        requestId: msg.requestId,
        resultCount: results.length,
        durationMs,
      });
      return;
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    self.postMessage({
      type: 'ERROR',
      requestId: msg.requestId,
      error: errorMsg,
    });
  }
};
