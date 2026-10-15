import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import styles from './OverviewPage.module.css';

export function OverviewPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1>
          FRONT<span className={styles.accent}>BENCH</span>
        </h1>
        <p className={styles.subtitle}>
          High-Performance Data Explorer and Microbenchmark Lab.
          Compare baseline and optimized frontend implementations under repeatable,
          deterministic workloads with zero fabricated metrics.
        </p>
      </header>

      <div className={styles.grid}>
        <Card variant="raised">
          <CardHeader>
            <h3>🔍 Data Explorer</h3>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Import CSV files or inspect synthetic datasets. Switch between full DOM and virtualized rendering.
            </p>
            <Button variant="primary" onClick={() => navigate('/explorer')}>
              Open Data Explorer →
            </Button>
          </CardContent>
        </Card>

        <Card variant="raised">
          <CardHeader>
            <h3>⚡ Performance Lab</h3>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Run controlled experiments comparing baseline vs. optimized paths (virtualization, search indexes, Web Workers, code splitting).
            </p>
            <Button variant="primary" onClick={() => navigate('/performance-lab')}>
              Open Performance Lab →
            </Button>
          </CardContent>
        </Card>

        <Card variant="raised">
          <CardHeader>
            <h3>📈 Column Analytics</h3>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Calculate counts, missing values, min/max/mean, and top categorical distributions with Web Worker offloading.
            </p>
            <Button variant="secondary" onClick={() => navigate('/analytics')}>
              View Analytics →
            </Button>
          </CardContent>
        </Card>

        <Card variant="raised">
          <CardHeader>
            <h3>📋 Benchmark History</h3>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Inspect saved benchmark runs, environment metadata, speedup ratios, and download raw CSV/JSON sample reports.
            </p>
            <Button variant="secondary" onClick={() => navigate('/benchmark-history')}>
              View History →
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card variant="outlined" className={styles.methodologyCard}>
        <CardHeader>
          <h3>Core Integrity Principles</h3>
        </CardHeader>
        <CardContent>
          <ul className={styles.methodologyList}>
            <li>
              <strong>Never Fabricate Results:</strong> Every displayed number comes directly from live browser <code>performance.now()</code> measurements or is explicitly marked as demo fixtures.
            </li>
            <li>
              <strong>Controlled Workloads:</strong> Baseline and optimized implementations are executed against identical deterministic seeded records and query sequences.
            </li>
            <li>
              <strong>Complete Sample Tracking:</strong> Warmup runs are separated from measured runs, and p50, p95, mean, min, and max are derived from raw sample arrays.
            </li>
            <li>
              <strong>Data Privacy:</strong> User CSV data remains local in browser IndexedDB — raw rows and cell contents are never sent to the API.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
