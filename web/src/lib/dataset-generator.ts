/**
 * Deterministic synthetic dataset generator using a seeded PRNG.
 * Same seed + rowCount always produces the same records.
 */

import type { DataRecord, ColumnSchema } from '../types';

/**
 * Mulberry32 — a simple, fast 32-bit seeded PRNG.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Books', 'Home', 'Sports', 'Toys', 'Health', 'Auto', 'Garden'];
const STATUSES = ['Active', 'Pending', 'Completed', 'Cancelled', 'Refunded'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central', 'Northeast', 'Southeast', 'Northwest', 'Southwest', 'Midwest'];
const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Iris', 'Jack', 'Kate', 'Leo', 'Mia', 'Nick', 'Olga', 'Paul', 'Quinn', 'Rose', 'Sam', 'Tina'];
const LAST_NAMES = ['Smith', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia', 'Clark', 'Lewis', 'Hall', 'Young', 'King'];

export const DATASET_COLUMNS: ColumnSchema[] = [
  { name: 'id', type: 'string', nullable: false },
  { name: 'name', type: 'string', nullable: false },
  { name: 'email', type: 'string', nullable: false },
  { name: 'date', type: 'date', nullable: false },
  { name: 'category', type: 'string', nullable: false },
  { name: 'status', type: 'string', nullable: false },
  { name: 'region', type: 'string', nullable: false },
  { name: 'amount', type: 'number', nullable: false },
  { name: 'quantity', type: 'number', nullable: false },
  { name: 'description', type: 'string', nullable: true },
];

function padZero(n: number, len: number = 2): string {
  return String(n).padStart(len, '0');
}

export function generateDataset(seed: number, rowCount: number): DataRecord[] {
  const rng = mulberry32(seed);
  const records: DataRecord[] = [];

  for (let i = 0; i < rowCount; i++) {
    const firstName = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    const year = 2020 + Math.floor(rng() * 5);
    const month = 1 + Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    const hasDescription = rng() > 0.15;

    records.push({
      id: `REC-${padZero(i + 1, 6)}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(rng() * 100)}@example.com`,
      date: `${year}-${padZero(month)}-${padZero(day)}`,
      category: CATEGORIES[Math.floor(rng() * CATEGORIES.length)],
      status: STATUSES[Math.floor(rng() * STATUSES.length)],
      region: REGIONS[Math.floor(rng() * REGIONS.length)],
      amount: Math.round(rng() * 10000) / 100,
      quantity: 1 + Math.floor(rng() * 50),
      description: hasDescription
        ? `Order for ${CATEGORIES[Math.floor(rng() * CATEGORIES.length)].toLowerCase()} items in ${REGIONS[Math.floor(rng() * REGIONS.length)].toLowerCase()} region`
        : null,
    });
  }

  return records;
}

export const BENCHMARK_SEARCH_TERMS = [
  'alice',
  'electronics',
  'north',
  'active',
  'order for',
] as const;

export const BENCHMARK_SIZES = [
  { label: '1,000 rows', value: 1000 },
  { label: '10,000 rows', value: 10000 },
  { label: '50,000 rows', value: 50000 },
] as const;

export const STRESS_SIZE = { label: '100,000 rows', value: 100000 };

export const DEFAULT_SEED = 42;
