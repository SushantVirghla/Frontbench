import { useState, useRef, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ResultsView } from './ResultsView';
import { getBrowserEnvironment } from './environment';
import { runExperimentA } from './experiments/experiment-a-render';
import { runExperimentB } from './experiments/experiment-b-search';
import { runExperimentC } from './experiments/experiment-c-worker';
import { runExperimentD } from './experiments/experiment-d-bundle';
import { DEFAULT_SEED, BENCHMARK_SIZES, STRESS_SIZE } from '../../lib/dataset-generator';
import type { BenchmarkRun, BenchmarkSample } from '../../types';
import styles from './PerformanceLabPage.module.css';

type ExperimentKey = 'experiment_a' | 'experiment_b' | 'experiment_c' | 'experiment_d';

const EXPERIMENTS: Record<ExperimentKey, { title: string; subtitle: string; description: string }> = {
  experiment_a: {
    title: 'A: Virtualization vs Full DOM',
    subtitle: 'DOM Node counts and commit/layout duration',
    description:
      'Compares mounting unvirtualized table rows against mounting only a virtualized viewport slice. Measures DOM creation time, forced layout time, and active DOM node counts under identical datasets.',
  },
  experiment_b: {
    title: 'B: Search Strategy',
    subtitle: 'Full-scan vs Pre-normalized index',
    description:
      'Compares linear case-insensitive substring search against a pre-normalized string index. Measures per-query computation time across a repeatable sequence of search terms.',
  },
  experiment_c: {
    title: 'C: Web Worker Offloading',
    subtitle: 'Main-thread blocking vs Background Worker',
    description:
      'Compares column statistical aggregation running directly on the main UI thread versus offloaded to a Web Worker. Measures total duration and main-thread blocking time.',
  },
  experiment_d: {
    title: 'D: Bundle Code Splitting',
    subtitle: 'Monolithic vs Route-split chunks',
    description:
      'Compares the initial JavaScript chunk size of an eagerly loaded application against an architecture with lazy-loaded route chunks.',
  },
};

export function PerformanceLabPage() {
  const [activeExperiment, setActiveExperiment] = useState<ExperimentKey>('experiment_a');
  const [rowCount, setRowCount] = useState<number>(10000);
  const [warmupRuns, setWarmupRuns] = useState<number>(3);
  const [measuredRuns, setMeasuredRuns] = useState<number>(15);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const [currentRun, setCurrentRun] = useState<BenchmarkRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelFlagRef = useRef<boolean>(false);

  const handleCancel = useCallback(() => {
    cancelFlagRef.current = true;
  }, []);

  const handleStartBenchmark = async () => {
    setIsRunning(true);
    setError(null);
    setCurrentRun(null);
    cancelFlagRef.current = false;

    const startedAt = new Date().toISOString();
    let samples: BenchmarkSample[] = [];

    try {
      const options = {
        rowCount,
        seed: DEFAULT_SEED,
        warmupRuns,
        measuredRuns,
        onProgress: setProgress,
        shouldCancel: () => cancelFlagRef.current,
      };

      if (activeExperiment === 'experiment_a') {
        samples = await runExperimentA(options);
      } else if (activeExperiment === 'experiment_b') {
        samples = await runExperimentB(options);
      } else if (activeExperiment === 'experiment_c') {
        samples = await runExperimentC(options);
      } else if (activeExperiment === 'experiment_d') {
        samples = await runExperimentD({ onProgress: setProgress });
      }

      const runResult: BenchmarkRun = {
        id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        suiteKey: activeExperiment,
        datasetProfileId: null,
        rowCount,
        randomSeed: DEFAULT_SEED,
        buildId: null,
        environment: getBrowserEnvironment(),
        startedAt,
        createdAt: new Date().toISOString(),
        methodologyVersion: '1.0.0',
        samples,
      };

      setCurrentRun(runResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Performance Lab</h2>
        <p className={styles.subtitle}>
          Run repeatable, deterministic microbenchmarks comparing baseline and optimized implementations on your machine.
        </p>
      </header>

      <div className={styles.integrityAlert} role="note">
        <strong>⚠️ Non-Negotiable Integrity Rule:</strong> Results below are measured live in your browser using <code>performance.now()</code>.
        No numbers are fabricated, hardcoded, or simulated. Baseline and optimized implementations are subjected to identical workloads.
      </div>

      <div className={styles.experimentTabs} role="tablist" aria-label="Benchmark experiments">
        {(Object.keys(EXPERIMENTS) as ExperimentKey[]).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeExperiment === key}
            className={`${styles.tabButton} ${activeExperiment === key ? styles.tabButtonActive : ''}`}
            onClick={() => {
              if (!isRunning) {
                setActiveExperiment(key);
                setCurrentRun(null);
                setError(null);
              }
            }}
          >
            {EXPERIMENTS[key].title}
          </button>
        ))}
      </div>

      <Card variant="outlined">
        <CardHeader>
          <h3>{EXPERIMENTS[activeExperiment].title}</h3>
          <p className={styles.subtitle}>{EXPERIMENTS[activeExperiment].subtitle}</p>
        </CardHeader>
        <CardContent className={styles.configCard}>
          <div className={styles.experimentDescription}>
            {EXPERIMENTS[activeExperiment].description}
          </div>

          <div className={styles.configRow}>
            {activeExperiment !== 'experiment_d' && (
              <div className={styles.configField}>
                <label className={styles.fieldLabel} htmlFor="row-count-select">
                  Dataset Size
                </label>
                <select
                  id="row-count-select"
                  className={styles.selectInput}
                  value={rowCount}
                  onChange={(e) => setRowCount(Number(e.target.value))}
                  disabled={isRunning}
                >
                  {BENCHMARK_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                  <option value={STRESS_SIZE.value}>
                    {STRESS_SIZE.label} (Stress Test)
                  </option>
                </select>
              </div>
            )}

            {activeExperiment !== 'experiment_d' && (
              <>
                <div className={styles.configField}>
                  <label className={styles.fieldLabel} htmlFor="warmup-runs-input">
                    Warm-up Runs
                  </label>
                  <input
                    id="warmup-runs-input"
                    type="number"
                    min="1"
                    max="10"
                    className={styles.numberInput}
                    value={warmupRuns}
                    onChange={(e) => setWarmupRuns(Math.max(1, Number(e.target.value)))}
                    disabled={isRunning}
                  />
                </div>

                <div className={styles.configField}>
                  <label className={styles.fieldLabel} htmlFor="measured-runs-input">
                    Measured Trials
                  </label>
                  <input
                    id="measured-runs-input"
                    type="number"
                    min="5"
                    max="50"
                    className={styles.numberInput}
                    value={measuredRuns}
                    onChange={(e) => setMeasuredRuns(Math.max(5, Number(e.target.value)))}
                    disabled={isRunning}
                  />
                </div>
              </>
            )}
          </div>

          <div className={styles.runControls}>
            <Button
              variant="primary"
              onClick={handleStartBenchmark}
              disabled={isRunning}
            >
              {isRunning ? 'Running Experiment...' : '⚡ Run Benchmark'}
            </Button>
            {isRunning && (
              <Button variant="danger" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>

          {progress && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.round((progress.current / progress.total) * 100)}%`,
                  }}
                />
              </div>
              <div className={styles.progressLabels}>
                <span>{progress.status}</span>
                <span>
                  {progress.current} of {progress.total} operations (
                  {Math.round((progress.current / progress.total) * 100)}%)
                </span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }} role="alert">
              ⚠️ {error}
            </div>
          )}
        </CardContent>
      </Card>

      {currentRun && <ResultsView run={currentRun} />}
    </div>
  );
}
