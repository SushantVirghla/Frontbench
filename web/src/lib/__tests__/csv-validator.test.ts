import { describe, it, expect } from 'vitest';
import { validateCSVStructure, inferColumnType } from '../csv-validator';

describe('csv-validator module', () => {
  describe('inferColumnType', () => {
    it('infers number type correctly', () => {
      expect(inferColumnType(['12.5', '45', '100', '0'])).toBe('number');
    });

    it('infers boolean type correctly', () => {
      expect(inferColumnType(['true', 'false', 'TRUE', 'false'])).toBe('boolean');
    });

    it('infers date type correctly', () => {
      expect(inferColumnType(['2023-01-15', '2024-05-20', '2022-11-03'])).toBe('date');
    });

    it('defaults to string for text or mixed types', () => {
      expect(inferColumnType(['Electronics', 'Books', 'Home'])).toBe('string');
      expect(inferColumnType(['abc', '123', 'xyz'])).toBe('string');
    });
  });

  describe('validateCSVStructure', () => {
    it('accepts valid CSV headers and rows', () => {
      const headers = ['id', 'name', 'price'];
      const rows = [
        ['1', 'Widget', '9.99'],
        ['2', 'Gadget', '19.99'],
      ];
      const result = validateCSVStructure(headers, rows);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.inferredColumns.length).toBe(3);
    });

    it('detects duplicate headers', () => {
      const headers = ['id', 'Name', 'name'];
      const rows = [['1', 'A', 'B']];
      const result = validateCSVStructure(headers, rows);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
    });

    it('detects empty headers', () => {
      const headers = ['id', '', 'amount'];
      const rows = [['1', 'test', '50']];
      const result = validateCSVStructure(headers, rows);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
    });

    it('flags warnings for inconsistent row column counts', () => {
      const headers = ['id', 'name', 'amount'];
      const rows = [
        ['1', 'test'], // 2 cols instead of 3
        ['2', 'test2', '100'],
      ];
      const result = validateCSVStructure(headers, rows);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
