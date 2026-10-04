import { describe, it, expect } from 'vitest';
import { generateDataset, DATASET_COLUMNS } from '../dataset-generator';

describe('dataset-generator module', () => {
  it('generates the exact requested number of records', () => {
    const records = generateDataset(42, 50);
    expect(records.length).toBe(50);
  });

  it('is completely deterministic for identical seed and count', () => {
    const run1 = generateDataset(12345, 100);
    const run2 = generateDataset(12345, 100);

    expect(run1).toEqual(run2);
  });

  it('produces different datasets for different seeds', () => {
    const run1 = generateDataset(1, 50);
    const run2 = generateDataset(2, 50);

    expect(run1[0].name).not.toBe(run2[0].name);
    expect(run1[0].email).not.toBe(run2[0].email);
  });

  it('includes all required schema columns on each record', () => {
    const records = generateDataset(42, 10);
    for (const record of records) {
      for (const col of DATASET_COLUMNS) {
        if (!col.nullable) {
          expect(record[col.name]).toBeDefined();
          expect(record[col.name]).not.toBeNull();
        }
      }
    }
  });

  it('generates valid stable IDs', () => {
    const records = generateDataset(42, 5);
    expect(records[0].id).toBe('REC-000001');
    expect(records[4].id).toBe('REC-000005');
  });
});
