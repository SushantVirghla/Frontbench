import type { ColumnSchema } from '../types';

export interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  headers: string[];
  inferredColumns: ColumnSchema[];
  estimatedRowCount: number;
}

/**
 * Infer the data type of an array of string values for a column.
 */
export function inferColumnType(values: (string | null | undefined)[]): ColumnSchema['type'] {
  const nonNull = values.filter((v): v is string => v != null && v.trim() !== '');
  if (nonNull.length === 0) return 'string';

  let numberCount = 0;
  let dateCount = 0;
  let booleanCount = 0;

  for (const val of nonNull) {
    const trimmed = val.trim();
    if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
      booleanCount++;
      continue;
    }
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      numberCount++;
      continue;
    }
    const parsedDate = Date.parse(trimmed);
    if (!isNaN(parsedDate) && trimmed.length >= 8 && /[/-]/.test(trimmed)) {
      dateCount++;
      continue;
    }
  }

  const threshold = nonNull.length * 0.85;
  if (booleanCount >= threshold) return 'boolean';
  if (numberCount >= threshold) return 'number';
  if (dateCount >= threshold) return 'date';
  return 'string';
}

/**
 * Validate CSV raw text or header slice before full processing.
 */
export function validateCSVStructure(
  rawHeaders: string[],
  sampleRows: string[][]
): CSVValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawHeaders || rawHeaders.length === 0 || (rawHeaders.length === 1 && rawHeaders[0].trim() === '')) {
    errors.push('The CSV file does not contain a valid header row.');
    return {
      isValid: false,
      errors,
      warnings,
      headers: [],
      inferredColumns: [],
      estimatedRowCount: 0,
    };
  }

  const cleanedHeaders = rawHeaders.map((h) => h.trim());

  // Check for duplicate headers
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const h of cleanedHeaders) {
    if (seen.has(h.toLowerCase())) {
      duplicates.add(h);
    }
    seen.add(h.toLowerCase());
  }

  if (duplicates.size > 0) {
    errors.push(`Duplicate column headers detected: ${Array.from(duplicates).join(', ')}`);
  }

  // Check empty header names
  if (cleanedHeaders.some((h) => h === '')) {
    errors.push('One or more column headers are empty.');
  }

  // Check row column count consistency
  const headerCount = cleanedHeaders.length;
  let inconsistentRows = 0;

  for (let i = 0; i < sampleRows.length; i++) {
    const row = sampleRows[i];
    if (row.length !== headerCount && !(row.length === 1 && row[0].trim() === '')) {
      inconsistentRows++;
    }
  }

  if (inconsistentRows > 0) {
    warnings.push(
      `${inconsistentRows} sample rows have column counts differing from the header count (${headerCount}). Heterogeneous fields will be normalized.`
    );
  }

  // Infer column schemas
  const inferredColumns: ColumnSchema[] = cleanedHeaders.map((name, colIdx) => {
    const sampleValues = sampleRows.map((r) => r[colIdx]);
    const type = inferColumnType(sampleValues);
    const hasNulls = sampleValues.some((v) => v == null || v.trim() === '');
    return {
      name,
      type,
      nullable: hasNulls,
    };
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    headers: cleanedHeaders,
    inferredColumns,
    estimatedRowCount: sampleRows.length,
  };
}
