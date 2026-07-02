/**
 * Column statistics and analytics calculations.
 */

import type { DataRecord, ColumnSchema, ColumnStats } from '../types';

export function computeColumnStats(
  records: DataRecord[],
  column: ColumnSchema
): ColumnStats {
  const values = records.map((r) => r[column.name]);
  const nonNull = values.filter((v) => v != null && v !== '');
  const missing = values.length - nonNull.length;

  const stats: ColumnStats = {
    column: column.name,
    type: column.type,
    count: values.length,
    missing,
    unique: new Set(nonNull.map(String)).size,
  };

  if (column.type === 'number') {
    const nums = nonNull.map(Number).filter((n) => !isNaN(n));
    if (nums.length > 0) {
      nums.sort((a, b) => a - b);
      stats.min = nums[0];
      stats.max = nums[nums.length - 1];
      stats.mean = nums.reduce((s, v) => s + v, 0) / nums.length;
    }
  }

  if (column.type === 'string') {
    const counts = new Map<string, number>();
    for (const v of nonNull) {
      const s = String(v);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    stats.topValues = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }));
  }

  return stats;
}

export function computeAllStats(
  records: DataRecord[],
  columns: ColumnSchema[]
): ColumnStats[] {
  return columns.map((col) => computeColumnStats(records, col));
}
