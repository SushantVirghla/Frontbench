import { generateDataset } from '../../../lib/dataset-generator';
import type { BenchmarkSample } from '../../../types';

export interface ExperimentARunOptions {
  rowCount: number;
  seed: number;
  warmupRuns: number;
  measuredRuns: number;
  onProgress?: (progress: { current: number; total: number; status: string }) => void;
  shouldCancel?: () => boolean;
}

/**
 * Experiment A: Measures DOM node creation and layout time for full render vs virtualized slice.
 */
export async function runExperimentA(
  options: ExperimentARunOptions
): Promise<BenchmarkSample[]> {
  const { rowCount, seed, warmupRuns, measuredRuns, onProgress, shouldCancel } = options;
  const samples: BenchmarkSample[] = [];

  // Generate identical dataset outside of timed operations
  const dataset = generateDataset(seed, rowCount);

  // Hidden test benchmark container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '1000px';
  container.style.height = '600px';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  const totalRuns = (warmupRuns + measuredRuns) * 2;
  let currentRun = 0;

  try {
    // 1. BASELINE RUNS (Full unvirtualized DOM render)
    // For safety, cap baseline at 5,000 rows to prevent browser freeze
    const baselineRecords = dataset.slice(0, Math.min(rowCount, 5000));
    const columnNames = ['id', 'name', 'email', 'date', 'category', 'status', 'region', 'amount', 'quantity'];

    for (let i = 0; i < warmupRuns + measuredRuns; i++) {
      if (shouldCancel?.()) throw new Error('Benchmark cancelled by user.');
      currentRun++;
      onProgress?.({
        current: currentRun,
        total: totalRuns,
        status: i < warmupRuns ? `Baseline warmup (${i + 1}/${warmupRuns})` : `Baseline trial (${i - warmupRuns + 1}/${measuredRuns})`,
      });

      // Clear container
      container.innerHTML = '';

      const t0 = performance.now();

      // Create table element
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const col of columnNames) {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (let r = 0; r < baselineRecords.length; r++) {
        const rec = baselineRecords[r];
        const tr = document.createElement('tr');
        for (const col of columnNames) {
          const td = document.createElement('td');
          td.textContent = String(rec[col] ?? '');
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      container.appendChild(table);

      // Force synchronous layout to measure true render/layout cost
      void container.offsetHeight;
      const t1 = performance.now();
      const domNodeCount = container.querySelectorAll('*').length;

      // Only record after warmup
      if (i >= warmupRuns) {
        const sampleIndex = i - warmupRuns;
        samples.push({
          scenarioKey: 'experiment_a_render',
          implementation: 'baseline',
          metricKey: 'render_duration',
          metricValue: t1 - t0,
          unit: 'ms',
          sampleIndex,
          recordedAt: new Date().toISOString(),
        });
        samples.push({
          scenarioKey: 'experiment_a_render',
          implementation: 'baseline',
          metricKey: 'dom_nodes_count',
          metricValue: domNodeCount,
          unit: 'count',
          sampleIndex,
          recordedAt: new Date().toISOString(),
        });
      }

      // Allow event loop cycle
      await new Promise((r) => setTimeout(r, 16));
    }

    // 2. OPTIMIZED RUNS (Virtualized slice - only visible window + buffer)
    const virtualWindowSize = 25; // 25 rows visible in 600px viewport + 10 overscan = 35 total
    const virtualSlice = dataset.slice(0, Math.min(rowCount, virtualWindowSize));

    for (let i = 0; i < warmupRuns + measuredRuns; i++) {
      if (shouldCancel?.()) throw new Error('Benchmark cancelled by user.');
      currentRun++;
      onProgress?.({
        current: currentRun,
        total: totalRuns,
        status: i < warmupRuns ? `Optimized warmup (${i + 1}/${warmupRuns})` : `Optimized trial (${i - warmupRuns + 1}/${measuredRuns})`,
      });

      container.innerHTML = '';

      const t0 = performance.now();

      // Virtualized container with spacer and rendered slice
      const vContainer = document.createElement('div');
      vContainer.style.height = '600px';
      vContainer.style.overflow = 'hidden';

      const spacer = document.createElement('div');
      spacer.style.height = `${rowCount * 40}px`;
      spacer.style.position = 'relative';

      for (let r = 0; r < virtualSlice.length; r++) {
        const rec = virtualSlice[r];
        const row = document.createElement('div');
        row.style.height = '40px';
        row.style.display = 'flex';
        row.style.position = 'absolute';
        row.style.top = `${r * 40}px`;
        row.style.width = '100%';

        for (const col of columnNames) {
          const cell = document.createElement('div');
          cell.style.flex = '1';
          cell.textContent = String(rec[col] ?? '');
          row.appendChild(cell);
        }
        spacer.appendChild(row);
      }
      vContainer.appendChild(spacer);
      container.appendChild(vContainer);

      void container.offsetHeight;
      const t1 = performance.now();
      const domNodeCount = container.querySelectorAll('*').length;

      if (i >= warmupRuns) {
        const sampleIndex = i - warmupRuns;
        samples.push({
          scenarioKey: 'experiment_a_render',
          implementation: 'optimized',
          metricKey: 'render_duration',
          metricValue: t1 - t0,
          unit: 'ms',
          sampleIndex,
          recordedAt: new Date().toISOString(),
        });
        samples.push({
          scenarioKey: 'experiment_a_render',
          implementation: 'optimized',
          metricKey: 'dom_nodes_count',
          metricValue: domNodeCount,
          unit: 'count',
          sampleIndex,
          recordedAt: new Date().toISOString(),
        });
      }

      await new Promise((r) => setTimeout(r, 16));
    }
  } finally {
    document.body.removeChild(container);
  }

  return samples;
}
