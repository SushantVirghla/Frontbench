import Dexie, { type EntityTable } from 'dexie';
import type { DatasetProfile, DataRecord, BenchmarkRun } from '../types';

export interface StoredRecord {
  internalId?: number;
  datasetId: string;
  recordId: string;
  data: DataRecord;
}

export interface ViewPreference {
  id: string;
  datasetId: string;
  columnVisibility: Record<string, boolean>;
  pageSize: number;
  useVirtualization: boolean;
  updatedAt: string;
}

class FrontBenchDatabase extends Dexie {
  profiles!: EntityTable<DatasetProfile, 'id'>;
  records!: EntityTable<StoredRecord, 'internalId'>;
  preferences!: EntityTable<ViewPreference, 'id'>;
  benchmarks!: EntityTable<BenchmarkRun, 'id'>;

  constructor() {
    super('FrontBenchDB');
    this.version(1).stores({
      profiles: 'id, name, sourceType, rowCount, createdAt',
      records: '++internalId, datasetId, recordId',
      preferences: 'id, datasetId',
    });
    this.version(2).stores({
      profiles: 'id, name, sourceType, rowCount, createdAt',
      records: '++internalId, datasetId, recordId',
      preferences: 'id, datasetId',
      benchmarks: 'id, suiteKey, rowCount, createdAt',
    });
  }
}

export const db = new FrontBenchDatabase();

/**
 * Save dataset profile and records in bounded batches to IndexedDB.
 * Gracefully handles quota errors.
 */
export async function saveDatasetLocally(
  profile: DatasetProfile,
  records: DataRecord[],
  batchSize = 2000,
  onProgress?: (saved: number, total: number) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.transaction('rw', [db.profiles, db.records], async () => {
      // Clear existing records for this dataset ID if overwriting
      await db.records.where('datasetId').equals(profile.id).delete();
      await db.profiles.put(profile);
    });

    const total = records.length;
    for (let i = 0; i < total; i += batchSize) {
      const batch = records.slice(i, i + batchSize).map((record) => ({
        datasetId: profile.id,
        recordId: record.id,
        data: record,
      }));

      await db.records.bulkAdd(batch);
      if (onProgress) {
        onProgress(Math.min(i + batch.length, total), total);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('QuotaExceededError') || message.includes('quota')) {
      return {
        success: false,
        error: 'Browser storage quota exceeded. Consider clearing previous datasets or using a smaller file.',
      };
    }
    return { success: false, error: `Failed to save dataset locally: ${message}` };
  }
}

/**
 * Load all records for a dataset from IndexedDB.
 */
export async function loadDatasetRecords(datasetId: string): Promise<DataRecord[]> {
  const stored = await db.records.where('datasetId').equals(datasetId).toArray();
  return stored.map((s) => s.data);
}

/**
 * Delete a dataset and its records from IndexedDB.
 */
export async function deleteDatasetLocally(datasetId: string): Promise<void> {
  await db.transaction('rw', [db.profiles, db.records, db.preferences], async () => {
    await db.records.where('datasetId').equals(datasetId).delete();
    await db.profiles.delete(datasetId);
    await db.preferences.where('datasetId').equals(datasetId).delete();
  });
}

/**
 * Save a benchmark run locally to IndexedDB.
 */
export async function saveBenchmarkRunLocally(run: BenchmarkRun): Promise<void> {
  await db.benchmarks.put(run);
}

/**
 * Load all recorded benchmark runs from IndexedDB ordered from newest to oldest.
 */
export async function loadBenchmarkRunsLocally(): Promise<BenchmarkRun[]> {
  const items = await db.benchmarks.orderBy('createdAt').reverse().toArray();
  return items.map((item) => ({ ...item, source: 'local' as const }));
}

/**
 * Delete a specific benchmark run from IndexedDB.
 */
export async function deleteBenchmarkRunLocally(id: string): Promise<void> {
  await db.benchmarks.delete(id);
}

/**
 * Clear all local benchmark runs from IndexedDB.
 */
export async function clearAllBenchmarkRunsLocally(): Promise<void> {
  await db.benchmarks.clear();
}
