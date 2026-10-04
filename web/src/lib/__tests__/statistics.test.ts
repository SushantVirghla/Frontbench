import { describe, it, expect } from 'vitest';
import {
  mean,
  median,
  percentile,
  p95,
  computeSummary,
  compareMetrics,
  formatMetric,
  formatPercentageChange,
} from '../statistics';

describe('statistics module', () => {
  describe('mean', () => {
    it('returns 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('calculates average correctly', () => {
      expect(mean([10, 20, 30])).toBe(20);
      expect(mean([5])).toBe(5);
    });
  });

  describe('median', () => {
    it('returns 0 for empty array', () => {
      expect(median([])).toBe(0);
    });

    it('returns middle element for odd length', () => {
      expect(median([5, 1, 9])).toBe(5); // sorted: 1, 5, 9
    });

    it('returns mean of middle elements for even length', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe('percentile and p95', () => {
    it('returns 0 for empty array', () => {
      expect(percentile([], 95)).toBe(0);
      expect(p95([])).toBe(0);
    });

    it('returns the single element for 1-item array', () => {
      expect(p95([42])).toBe(42);
    });

    it('interpolates p95 correctly on a 100-element uniform sequence', () => {
      const values = Array.from({ length: 101 }, (_, i) => i);
      expect(p95(values)).toBe(95);
    });
  });

  describe('computeSummary', () => {
    it('computes full summary object with min, max, median, p95', () => {
      const summary = computeSummary('render_time', 'ms', [10, 20, 30, 40, 50]);
      expect(summary.metricKey).toBe('render_time');
      expect(summary.unit).toBe('ms');
      expect(summary.sampleCount).toBe(5);
      expect(summary.min).toBe(10);
      expect(summary.max).toBe(50);
      expect(summary.median).toBe(30);
      expect(summary.mean).toBe(30);
    });
  });

  describe('compareMetrics', () => {
    it('calculates improvement correctly when optimized is faster', () => {
      const baseline = computeSummary('time', 'ms', [100, 100, 100, 100, 100]);
      const optimized = computeSummary('time', 'ms', [20, 20, 20, 20, 20]);
      const comparison = compareMetrics(baseline, optimized);

      expect(comparison.direction).toBe('improvement');
      expect(comparison.percentageChange).toBe(80); // (100 - 20) / 100 * 100
      expect(comparison.speedupRatio).toBe(5); // 100 / 20
      expect(comparison.absoluteDifference).toBe(80);
    });

    it('flags regression when optimized is slower', () => {
      const baseline = computeSummary('time', 'ms', [50, 50, 50, 50, 50]);
      const optimized = computeSummary('time', 'ms', [100, 100, 100, 100, 100]);
      const comparison = compareMetrics(baseline, optimized);

      expect(comparison.direction).toBe('regression');
      expect(comparison.percentageChange).toBe(-100);
      expect(comparison.speedupRatio).toBe(0.5);
    });

    it('flags neutral when change is within 5%', () => {
      const baseline = computeSummary('time', 'ms', [100, 100, 100, 100, 100]);
      const optimized = computeSummary('time', 'ms', [98, 98, 98, 98, 98]);
      const comparison = compareMetrics(baseline, optimized);

      expect(comparison.direction).toBe('neutral');
    });

    it('warns when sample count is low', () => {
      const baseline = computeSummary('time', 'ms', [100]);
      const optimized = computeSummary('time', 'ms', [50]);
      const comparison = compareMetrics(baseline, optimized);

      expect(comparison.warning).toContain('Low sample count');
    });

    it('handles zero baseline safely without NaN', () => {
      const baseline = computeSummary('time', 'ms', [0, 0, 0, 0, 0]);
      const optimized = computeSummary('time', 'ms', [10, 10, 10, 10, 10]);
      const comparison = compareMetrics(baseline, optimized);

      expect(comparison.percentageChange).toBeNull();
    });

    it('warns on unit mismatch', () => {
      const baseline = computeSummary('time', 'ms', [10, 10, 10, 10, 10]);
      const optimized = computeSummary('time', 'bytes', [10, 10, 10, 10, 10]);
      const comparison = compareMetrics(baseline, optimized);

      expect(comparison.warning).toContain('Unit mismatch');
      expect(comparison.percentageChange).toBeNull();
    });
  });

  describe('formatting helpers', () => {
    it('formats percentages with signs', () => {
      expect(formatPercentageChange(15.234)).toBe('+15.2%');
      expect(formatPercentageChange(-8.5)).toBe('-8.5%');
      expect(formatPercentageChange(null)).toBe('N/A');
    });

    it('formats metrics with units', () => {
      expect(formatMetric(0.2456, 'ms')).toBe('0.246 ms');
      expect(formatMetric(12.5, 'ms')).toBe('12.5 ms');
      expect(formatMetric(5000, 'count')).toBe('5,000');
    });
  });
});
