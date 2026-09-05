import { useMemo } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  computeSummary,
  compareMetrics,
  extractMetricValues,
  formatMetric,
  formatPercentageChange,
} from '../../lib/statistics';
import type { BenchmarkRun, ComparisonResult } from '../../types';
import styles from './ResultsView.module.css';

interface ResultsViewProps {
  run: BenchmarkRun;
}

export function ResultsView({ run }: ResultsViewProps) {
  // Extract unique scenario and metric keys
  const comparisons = useMemo<ComparisonResult[]>(() => {
    const scenarioKeys = Array.from(new Set(run.samples.map((s) => s.scenarioKey)));
    const results: ComparisonResult[] = [];

    for (const scenarioKey of scenarioKeys) {
      const scenarioSamples = run.samples.filter((s) => s.scenarioKey === scenarioKey);
      const metricKeys = Array.from(new Set(scenarioSamples.map((s) => s.metricKey)));

      for (const metricKey of metricKeys) {
        const baselineValues = extractMetricValues(run.samples, scenarioKey, 'baseline', metricKey);
        const optimizedValues = extractMetricValues(run.samples, scenarioKey, 'optimized', metricKey);

        const sample = scenarioSamples.find((s) => s.metricKey === metricKey);
        const unit = sample?.unit || 'ms';

        const baselineSummary = computeSummary(metricKey, unit, baselineValues);
        const optimizedSummary = computeSummary(metricKey, unit, optimizedValues);

        results.push(compareMetrics(baselineSummary, optimizedSummary));
      }
    }

    return results;
  }, [run]);

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frontbench-run-${run.suiteKey}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const headers = 'run_id,suite_key,scenario_key,implementation,metric_key,metric_value,unit,sample_index,recorded_at';
    const rows = run.samples.map(
      (s) =>
        `${run.id},${run.suiteKey},${s.scenarioKey},${s.implementation},${s.metricKey},${s.metricValue},${s.unit},${s.sampleIndex},${s.recordedAt}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frontbench-samples-${run.suiteKey}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3>Benchmark Results: {run.suiteKey}</h3>
          <Badge variant="success">Measured Locally</Badge>
        </div>
        <div className={styles.exportBar}>
          <Button variant="secondary" size="sm" onClick={handleDownloadCSV}>
            ⬇ Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownloadJSON}>
            ⬇ Export JSON
          </Button>
        </div>
      </div>

      <div className={styles.envCard}>
        <div className={styles.envItem}>
          <span>Browser:</span> <strong>{run.environment.browserName} {run.environment.browserVersion}</strong>
        </div>
        <div className={styles.envItem}>
          <span>Viewport:</span> <strong>{run.environment.viewport.width}x{run.environment.viewport.height}</strong>
        </div>
        <div className={styles.envItem}>
          <span>CPU Cores:</span> <strong>{run.environment.hardwareConcurrency}</strong>
        </div>
        <div className={styles.envItem}>
          <span>Build:</span> <strong>{run.environment.buildType}</strong>
        </div>
        <div className={styles.envItem}>
          <span>Row Count:</span> <strong>{run.rowCount.toLocaleString()}</strong>
        </div>
        <div className={styles.envItem}>
          <span>Methodology:</span> <strong>v{run.methodologyVersion}</strong>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {comparisons.map((c) => {
          const baselineSamples = extractMetricValues(run.samples, 'experiment_a_render', 'baseline', c.metricKey)
            .concat(extractMetricValues(run.samples, 'experiment_b_search', 'baseline', c.metricKey))
            .concat(extractMetricValues(run.samples, 'experiment_c_worker', 'baseline', c.metricKey))
            .concat(extractMetricValues(run.samples, 'experiment_d_bundle', 'baseline', c.metricKey));

          const optimizedSamples = extractMetricValues(run.samples, 'experiment_a_render', 'optimized', c.metricKey)
            .concat(extractMetricValues(run.samples, 'experiment_b_search', 'optimized', c.metricKey))
            .concat(extractMetricValues(run.samples, 'experiment_c_worker', 'optimized', c.metricKey))
            .concat(extractMetricValues(run.samples, 'experiment_d_bundle', 'optimized', c.metricKey));

          return (
            <div key={c.metricKey} className={styles.comparisonCard}>
              <div className={styles.comparisonHeader}>
                <h4 className={styles.metricTitle}>{c.metricKey.replace(/_/g, ' ')}</h4>
                <Badge
                  variant={
                    c.direction === 'improvement'
                      ? 'success'
                      : c.direction === 'regression'
                      ? 'danger'
                      : 'default'
                  }
                >
                  {c.direction}
                </Badge>
              </div>

              <div className={styles.resultHighlight}>
                <span
                  className={`${styles.percentageBig} ${
                    c.direction === 'improvement'
                      ? styles.improvement
                      : c.direction === 'regression'
                      ? styles.regression
                      : styles.neutral
                  }`}
                >
                  {formatPercentageChange(c.percentageChange)}
                </span>
                {c.speedupRatio && (
                  <span className={styles.speedup}>
                    ({c.speedupRatio.toFixed(2)}x speedup)
                  </span>
                )}
              </div>

              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th>Stat</th>
                    <th>Baseline</th>
                    <th>Optimized</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Median (p50)</td>
                    <td>{formatMetric(c.baseline.median, c.unit)}</td>
                    <td>{formatMetric(c.optimized.median, c.unit)}</td>
                  </tr>
                  <tr>
                    <td>p95</td>
                    <td>{formatMetric(c.baseline.p95, c.unit)}</td>
                    <td>{formatMetric(c.optimized.p95, c.unit)}</td>
                  </tr>
                  <tr>
                    <td>Mean</td>
                    <td>{formatMetric(c.baseline.mean, c.unit)}</td>
                    <td>{formatMetric(c.optimized.mean, c.unit)}</td>
                  </tr>
                  <tr>
                    <td>Min / Max</td>
                    <td>{formatMetric(c.baseline.min, c.unit)} / {formatMetric(c.baseline.max, c.unit)}</td>
                    <td>{formatMetric(c.optimized.min, c.unit)} / {formatMetric(c.optimized.max, c.unit)}</td>
                  </tr>
                  <tr>
                    <td>Sample Count</td>
                    <td>{c.baseline.sampleCount}</td>
                    <td>{c.optimized.sampleCount}</td>
                  </tr>
                </tbody>
              </table>

              {c.warning && <div className={styles.warningBox}>{c.warning}</div>}

              <div className={styles.samplesStrip}>
                <span className={styles.stripLabel}>
                  Samples (Gray: Baseline, Blue: Optimized)
                </span>
                <div className={styles.sampleDots}>
                  {baselineSamples.map((v, i) => (
                    <span
                      key={`b-${i}`}
                      className={`${styles.dot} ${styles.baselineDot}`}
                      title={`Baseline run #${i + 1}: ${formatMetric(v, c.unit)}`}
                    />
                  ))}
                  {optimizedSamples.map((v, i) => (
                    <span
                      key={`o-${i}`}
                      className={`${styles.dot} ${styles.optimizedDot}`}
                      title={`Optimized run #${i + 1}: ${formatMetric(v, c.unit)}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
