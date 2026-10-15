import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ResultsView } from '../performance-lab/ResultsView';
import {
  loadBenchmarkRunsLocally,
  deleteBenchmarkRunLocally,
  clearAllBenchmarkRunsLocally,
} from '../../storage/db';
import type { BenchmarkRun } from '../../types';
import styles from './BenchmarkHistoryPage.module.css';

const SUITE_LABELS: Record<string, string> = {
  experiment_a: 'Exp A: Virtualization vs Full DOM',
  experiment_b: 'Exp B: Search Strategy (Index vs Scan)',
  experiment_c: 'Exp C: Web Worker Offloading',
  experiment_d: 'Exp D: Bundle Code Splitting',
};

export function BenchmarkHistoryPage() {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BenchmarkRun | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const loadAllRuns = async () => {
    setIsLoading(true);
    let localRuns: BenchmarkRun[] = [];
    try {
      localRuns = await loadBenchmarkRunsLocally();
    } catch {
      localRuns = [];
    }

    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        setApiOnline(true);
        const runsRes = await fetch('/api/benchmark-runs');
        if (runsRes.ok) {
          const apiData = await runsRes.json();
          if (apiData && Array.isArray(apiData.items)) {
            const remoteRuns: BenchmarkRun[] = apiData.items.map((r: BenchmarkRun) => ({
              ...r,
              source: 'api' as const,
            }));

            // Merge local and remote, deduplicating by ID
            const seenIds = new Set(localRuns.map((r) => r.id));
            const merged = [...localRuns];
            for (const remote of remoteRuns) {
              if (!seenIds.has(remote.id)) {
                merged.push(remote);
              }
            }
            // Sort newest first
            merged.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setRuns(merged);
            setIsLoading(false);
            return;
          }
        }
      } else {
        setApiOnline(false);
      }
    } catch {
      setApiOnline(false);
    }

    setRuns(localRuns);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllRuns();
  }, []);

  const handleDeleteRun = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    await deleteBenchmarkRunLocally(runId);
    if (selectedRun?.id === runId) {
      setSelectedRun(null);
    }
    setRuns((prev) => prev.filter((r) => r.id !== runId));
  };

  const handleClearLocalRuns = async () => {
    if (confirm('Clear all locally saved benchmark runs from IndexedDB?')) {
      await clearAllBenchmarkRunsLocally();
      setSelectedRun(null);
      await loadAllRuns();
    }
  };

  const localRunsCount = runs.filter((r) => r.source === 'local').length;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h2>Benchmark History</h2>
          <p className={styles.runSubtitle}>
            Review and inspect recorded benchmark runs, workloads, and environments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {localRunsCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearLocalRuns}>
              🗑️ Clear Local History
            </Button>
          )}

          <div className={styles.statusIndicator} role="status">
            <span className={apiOnline ? styles.onlineDot : styles.offlineDot} />
            <span>{apiOnline ? 'Fastify + Postgres Connected' : 'Local IndexedDB Mode (API Offline)'}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading benchmark history...
        </div>
      ) : runs.length === 0 && !selectedRun ? (
        <EmptyState
          icon="📋"
          title="No Benchmark Runs Recorded Yet"
          description="You haven't run any benchmark experiments yet. Head over to the Performance Lab to compare baseline vs. optimized algorithms with live measurements."
          actionLabel="⚡ Open Performance Lab"
          onAction={() => navigate('/performance-lab')}
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
                  {SUITE_LABELS[run.suiteKey] || run.suiteKey}
                  <Badge variant="default">{run.rowCount.toLocaleString()} rows</Badge>
                  {run.datasetName && (
                    <Badge variant="default">{run.datasetName}</Badge>
                  )}
                  <Badge variant={run.source === 'local' ? 'info' : 'success'}>
                    {run.source === 'local' ? '💾 IndexedDB' : '🗄️ PostgreSQL'}
                  </Badge>
                </span>
                <span className={styles.runSubtitle}>
                  Recorded: {new Date(run.createdAt).toLocaleString()} | Browser: {run.environment.browserName} {run.environment.browserVersion} | {run.samples.length} samples
                </span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <Button variant="secondary" size="sm">
                  View Results →
                </Button>
                {run.source === 'local' && (
                  <button
                    onClick={(e) => handleDeleteRun(e, run.id)}
                    title="Delete this local benchmark run"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-tertiary)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                    aria-label={`Delete run ${run.id}`}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRun && (
        <Card variant="raised" style={{ marginTop: 'var(--space-4)' }}>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Run Details: {SUITE_LABELS[selectedRun.suiteKey] || selectedRun.suiteKey} ({selectedRun.id})</h3>
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
