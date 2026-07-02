/**
 * Search, filter and sort operations.
 * Baseline: simple full-scan with no pre-processing.
 * Optimized: pre-normalized searchable index.
 */

import type { DataRecord, FilterConfig, SortConfig } from '../types';

export function baselineSearch(records: DataRecord[], query: string): DataRecord[] {
  if (!query.trim()) return records;
  const lowerQuery = query.toLowerCase();
  return records.filter((record) =>
    Object.values(record).some((value) => {
      if (value == null) return false;
      return String(value).toLowerCase().includes(lowerQuery);
    })
  );
}

export function buildSearchIndex(records: DataRecord[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const record of records) {
    const searchable = Object.entries(record)
      .filter(([key]) => key !== 'id')
      .map(([, value]) => (value == null ? '' : String(value).toLowerCase()))
      .join(' ');
    index.set(record.id, searchable);
  }
  return index;
}

export function optimizedSearch(
  records: DataRecord[],
  index: Map<string, string>,
  query: string
): DataRecord[] {
  if (!query.trim()) return records;
  const lowerQuery = query.toLowerCase();
  return records.filter((record) => {
    const searchable = index.get(record.id);
    return searchable ? searchable.includes(lowerQuery) : false;
  });
}

export function applyFilters(records: DataRecord[], filters: FilterConfig[]): DataRecord[] {
  if (filters.length === 0) return records;
  return records.filter((record) =>
    filters.every((f) => {
      const value = record[f.column];
      if (value == null) return false;
      const strValue = String(value).toLowerCase();
      const filterValue = f.value.toLowerCase();
      switch (f.operator) {
        case 'equals': return strValue === filterValue;
        case 'contains': return strValue.includes(filterValue);
        case 'gt': return Number(value) > Number(f.value);
        case 'lt': return Number(value) < Number(f.value);
        case 'gte': return Number(value) >= Number(f.value);
        case 'lte': return Number(value) <= Number(f.value);
        default: return true;
      }
    })
  );
}

export function sortRecords(records: DataRecord[], sort: SortConfig): DataRecord[] {
  return [...records].sort((a, b) => {
    const aVal = a[sort.column];
    const bVal = b[sort.column];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    let comparison: number;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sort.direction === 'desc' ? -comparison : comparison;
  });
}
