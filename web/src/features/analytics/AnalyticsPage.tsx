import { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { ImportModal } from '../import/ImportModal';
import { generateDataset, DEFAULT_SEED, DATASET_COLUMNS } from '../../lib/dataset-generator';
import { computeAllStats } from '../../lib/analytics';
import { workerClient } from '../../services/worker-client';
import type { DataRecord, ColumnStats, ColumnSchema, DatasetProfile } from '../../types';
import styles from './AnalyticsPage.module.css';

export function AnalyticsPage() {
  const [data, setData] = useState<DataRecord[]>([]);
  const [columns, setColumns] = useState<ColumnSchema[]>(DATASET_COLUMNS);
  const [activeDatasetName, setActiveDatasetName] = useState<string>('Synthetic Orders');
  const [stats, setStats] = useState<ColumnStats[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [computeMode, setComputeMode] = useState<'main_thread' | 'web_worker'>('web_worker');
  const [computeDuration, setComputeDuration] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleLoadDemo = useCallback(
    async (rowCount: number = 10000) => {
      setIsComputing(true);
      const dataset = generateDataset(DEFAULT_SEED, rowCount);
      setData(dataset);
      setColumns(DATASET_COLUMNS);
      setActiveDatasetName(`Synthetic Orders (${rowCount.toLocaleString()} rows)`);
      setIsLoaded(true);

      const t0 = performance.now();
      if (computeMode === 'web_worker') {
        const res = await workerClient.computeAnalytics(dataset, DATASET_COLUMNS);
        setStats(res.stats);
      } else {
        const s = computeAllStats(dataset, DATASET_COLUMNS);
        setStats(s);
      }
      const t1 = performance.now();
      setComputeDuration(t1 - t0);
      setIsComputing(false);
    },
    [computeMode]
  );

  const handleImportComplete = useCallback(
    async (dataset: { profile: DatasetProfile; records: DataRecord[] }) => {
      setIsComputing(true);
      setData(dataset.records);
      setColumns(dataset.profile.columns);
      setActiveDatasetName(dataset.profile.name);
      setIsLoaded(true);

      const t0 = performance.now();
      if (computeMode === 'web_worker') {
        const res = await workerClient.computeAnalytics(dataset.records, dataset.profile.columns);
        setStats(res.stats);
      } else {
        const s = computeAllStats(dataset.records, dataset.profile.columns);
        setStats(s);
      }
      const t1 = performance.now();
      setComputeDuration(t1 - t0);
      setIsComputing(false);
    },
    [computeMode]
  );

  const handleRecompute = useCallback(async () => {
    if (data.length === 0) return;
    setIsComputing(true);
    const t0 = performance.now();
    if (computeMode === 'web_worker') {
      const res = await workerClient.computeAnalytics(data, columns);
      setStats(res.stats);
    } else {
      const s = computeAllStats(data, columns);
      setStats(s);
    }
    const t1 = performance.now();
    setComputeDuration(t1 - t0);
    setIsComputing(false);
  }, [data, columns, computeMode]);

  if (!isLoaded) {
    return (
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div>
            <h2>Analytics & Distributions</h2>
            <p className={styles.subtitle}>
              Compute column summary statistics, missing value ratios, and categorical distributions off-thread.
            </p>
          </div>
          <div className={styles.controlsBar}>
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              📂 Import CSV from PC
            </Button>
            <Button variant="primary" onClick={() => handleLoadDemo(10000)}>
              ⚡ Load 10k Demo
            </Button>
          </div>
        </div>

        <EmptyState
          icon="📈"
          title="No Dataset Loaded for Analytics"
          description="Import your own CSV file from your PC for custom dataset testing, or load a synthetic dataset to calculate distributions."
          actionLabel="📂 Import CSV from PC"
          onAction={() => setIsImportOpen(true)}
        />

        <ImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImportComplete={handleImportComplete}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h2>Analytics & Distributions</h2>
          <p className={styles.subtitle}>
            {activeDatasetName} — {data.length.toLocaleString()} records across {columns.length} columns.
          </p>
        </div>

        <div className={styles.controlsBar}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            disabled={isComputing}
          >
            📂 Import CSV
          </Button>

          <div className={styles.segmentedControl} role="radiogroup" aria-label="Computation target">
            <button
              type="button"
              role="radio"
              aria-checked={computeMode === 'web_worker'}
              className={`${styles.segmentBtn} ${computeMode === 'web_worker' ? styles.segmentBtnActive : ''}`}
              onClick={() => setComputeMode('web_worker')}
            >
              ⚡ Web Worker
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={computeMode === 'main_thread'}
              className={`${styles.segmentBtn} ${computeMode === 'main_thread' ? styles.segmentBtnActive : ''}`}
              onClick={() => setComputeMode('main_thread')}
            >
              💻 Main Thread
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecompute}
            disabled={isComputing}
          >
            {isComputing ? 'Computing...' : 'Recalculate'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleLoadDemo(50000)}
            disabled={isComputing}
          >
            Load 50k
          </Button>
        </div>
      </div>

      {computeDuration !== null && (
        <div className={styles.durationBanner}>
          <span>
            Computed in <strong>{computeDuration.toFixed(2)} ms</strong> via{' '}
            <Badge variant={computeMode === 'web_worker' ? 'info' : 'warning'}>
              {computeMode === 'web_worker' ? 'Web Worker (Off-thread)' : 'Main Thread'}
            </Badge>
          </span>
        </div>
      )}

      <div className={styles.grid}>
        {stats.map((stat) => (
          <StatCard key={stat.column} stat={stat} totalRows={data.length} />
        ))}
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

function StatCard({ stat, totalRows }: { stat: ColumnStats; totalRows: number }) {
  return (
    <Card variant="outlined">
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4>{stat.column}</h4>
          <span className={styles.typeBadge}>{stat.type}</span>
        </div>
      </CardHeader>
      <CardContent>
        <dl className={styles.statList}>
          <div className={styles.statRow}>
            <dt>Count</dt>
            <dd>{stat.count.toLocaleString()}</dd>
          </div>
          <div className={styles.statRow}>
            <dt>Missing</dt>
            <dd>
              {stat.missing.toLocaleString()}{' '}
              <span className={styles.percentageTag}>
                ({((stat.missing / totalRows) * 100).toFixed(1)}%)
              </span>
            </dd>
          </div>
          <div className={styles.statRow}>
            <dt>Unique Values</dt>
            <dd>{stat.unique.toLocaleString()}</dd>
          </div>
          {stat.min != null && (
            <>
              <div className={styles.statRow}>
                <dt>Minimum</dt>
                <dd>{stat.min.toLocaleString()}</dd>
              </div>
              <div className={styles.statRow}>
                <dt>Maximum</dt>
                <dd>{stat.max?.toLocaleString()}</dd>
              </div>
              <div className={styles.statRow}>
                <dt>Mean</dt>
                <dd>{stat.mean?.toFixed(2)}</dd>
              </div>
            </>
          )}
          {stat.topValues && stat.topValues.length > 0 && (
            <div className={styles.topValues}>
              <dt>Top Categories</dt>
              <dd>
                <ul className={styles.valueList}>
                  {stat.topValues.slice(0, 5).map((v) => {
                    const pct = Math.round((v.count / totalRows) * 100);
                    return (
                      <li key={v.value} className={styles.categoryItem}>
                        <div className={styles.categoryInfo}>
                          <span className={styles.catName}>{v.value}</span>
                          <span className={styles.catCount}>
                            {v.count.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className={styles.catBarTrack}>
                          <div
                            className={styles.catBarFill}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
