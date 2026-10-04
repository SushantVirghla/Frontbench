import { describe, it, expect } from 'vitest';
import { generateDataset } from '../dataset-generator';
import {
  baselineSearch,
  buildSearchIndex,
  optimizedSearch,
  applyFilters,
  sortRecords,
} from '../search';

describe('search, filter and sort module', () => {
  const dataset = generateDataset(42, 200);

  describe('baseline vs optimized search equivalence', () => {
    const searchIndex = buildSearchIndex(dataset);

    it('returns identical records for empty search', () => {
      const bRes = baselineSearch(dataset, '');
      const oRes = optimizedSearch(dataset, searchIndex, '');
      expect(bRes).toEqual(oRes);
    });

    it('returns equivalent matched record IDs for keyword queries', () => {
      const queries = ['alice', 'electronics', 'north', 'active', 'order for', 'xyznonexistent'];
      for (const q of queries) {
        const bRes = baselineSearch(dataset, q);
        const oRes = optimizedSearch(dataset, searchIndex, q);

        const bIds = bRes.map((r) => r.id);
        const oIds = oRes.map((r) => r.id);

        expect(bIds).toEqual(oIds);
      }
    });

    it('performs case-insensitive searches', () => {
      const lower = baselineSearch(dataset, 'electronics');
      const upper = baselineSearch(dataset, 'ELECTRONICS');
      expect(lower.map((r) => r.id)).toEqual(upper.map((r) => r.id));
    });
  });

  describe('applyFilters', () => {
    it('filters numeric fields by gt and lt', () => {
      const filtered = applyFilters(dataset, [
        { column: 'amount', operator: 'gt', value: '50' },
        { column: 'amount', operator: 'lt', value: '80' },
      ]);
      expect(filtered.length).toBeGreaterThan(0);
      for (const r of filtered) {
        const amt = Number(r.amount);
        expect(amt).toBeGreaterThan(50);
        expect(amt).toBeLessThan(80);
      }
    });

    it('filters string fields by equals and contains', () => {
      const filtered = applyFilters(dataset, [
        { column: 'status', operator: 'equals', value: 'active' },
      ]);
      expect(filtered.length).toBeGreaterThan(0);
      for (const r of filtered) {
        expect(String(r.status).toLowerCase()).toBe('active');
      }
    });
  });

  describe('sortRecords', () => {
    it('sorts numeric columns ascending and descending', () => {
      const asc = sortRecords(dataset, { column: 'amount', direction: 'asc' });
      for (let i = 1; i < asc.length; i++) {
        expect(Number(asc[i].amount)).toBeGreaterThanOrEqual(Number(asc[i - 1].amount));
      }

      const desc = sortRecords(dataset, { column: 'amount', direction: 'desc' });
      for (let i = 1; i < desc.length; i++) {
        expect(Number(desc[i].amount)).toBeLessThanOrEqual(Number(desc[i - 1].amount));
      }
    });

    it('sorts string columns alphabetically', () => {
      const sorted = sortRecords(dataset, { column: 'name', direction: 'asc' });
      for (let i = 1; i < sorted.length; i++) {
        expect(String(sorted[i].name).localeCompare(String(sorted[i - 1].name))).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
