import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ResultsView } from '../performance-lab/ResultsView';
import type { BenchmarkRun } from '../../types';
import styles from './BenchmarkHistoryPage.module.css';

export function BenchmarkHistoryPage() {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BenchmarkRun | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);

  useEffect(() => {
    // Check if the backend API is reachable
    fetch('/api/health')
      .then((res) => {
        if (res.ok) {
          setApiOnline(true);
          return fetch('/api/benchmark-runs');
        }
        return null;
      })
      .then((res) => (res && res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setRuns(data.items);
        }
      })
      .catch(() => {
        setApiOnline(false);
      });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h2>Benchmark History</h2>
          <p className={styles.runSubtitle}>
            Review and compare recorded benchmark runs and environments.
          </p>
        </div>

        <div className={styles.statusIndicator} role="status">
          <span className={apiOnline ? styles.onlineDot : styles.offlineDot} />
          <span>{apiOnline ? 'Fastify API Connected' : 'Local Browser Mode (API Offline)'}</span>
        </div>
      </div>

      {runs.length === 0 && !selectedRun ? (
        <EmptyState
          icon="📋"
          title="No Persisted History Runs"
          description={
            apiOnline
              ? 'No benchmark runs have been saved to the database yet. Run an experiment in the Performance Lab to record history.'
              : 'The API is currently offline. Benchmarks run in the Performance Lab are stored in-memory during this session and can be exported as JSON or CSV.'
          }
        />
      ) : (
        <div className={styles.runsList}>
          {runs.map((run) => (
            <div
              key={run.id}
              className={styles.runItem}
              onClick={() => setSelectedRun(run)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedRun(run);
                }
              }}
            >
              <div className={styles.runMeta}>
                <span className={styles.runTitle}>
                  {run.suiteKey}
                  <Badge variant="default">{run.rowCount.toLocaleString()} rows</Badge>
                </span>
                <span className={styles.runSubtitle}>
                  Recorded: {new Date(run.createdAt).toLocaleString()} | Browser: {run.environment.browserName}
                </span>
              </div>
              <Badge variant="info">View Results →</Badge>
            </div>
          ))}
        </div>
      )}

      {selectedRun && (
        <Card variant="raised" style={{ marginTop: 'var(--space-4)' }}>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Run Details: {selectedRun.id}</h3>
              <button
                onClick={() => setSelectedRun(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <ResultsView run={selectedRun} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
