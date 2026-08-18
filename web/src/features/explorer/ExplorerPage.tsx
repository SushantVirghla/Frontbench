import { useState, useMemo, useCallback, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { DataTable } from './DataTable';
import { VirtualizedDataTable } from './VirtualizedDataTable';
import { SearchBar } from './SearchBar';
import { ImportModal } from '../import/ImportModal';
import { generateDataset, DEFAULT_SEED, DATASET_COLUMNS } from '../../lib/dataset-generator';
import { baselineSearch, sortRecords } from '../../lib/search';
import type { DataRecord, ColumnSchema, SortConfig, DatasetProfile } from '../../types';
import styles from './ExplorerPage.module.css';

export function ExplorerPage() {
  const [data, setData] = useState<DataRecord[]>([]);
  const [columns, setColumns] = useState<ColumnSchema[]>(DATASET_COLUMNS);
  const [activeProfile, setActiveProfile] = useState<DatasetProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [viewMode, setViewMode] = useState<'virtualized' | 'baseline'>('virtualized');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Stale search sequence guard
  const searchSequenceRef = useRef<number>(0);

  const handleLoadDemo = useCallback((rowCount: number = 10000) => {
    const records = generateDataset(DEFAULT_SEED, rowCount);
    const profile: DatasetProfile = {
      id: `demo-${rowCount}`,
      name: `Synthetic Orders (${rowCount.toLocaleString()} rows)`,
      sourceType: 'synthetic',
      rowCount,
      columns: DATASET_COLUMNS,
      byteSize: null,
      createdAt: new Date().toISOString(),
    };
    setData(records);
    setColumns(DATASET_COLUMNS);
    setActiveProfile(profile);
    setIsLoaded(true);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    searchSequenceRef.current += 1;
    setSearchQuery(query);
  }, []);

  const filteredAndSorted = useMemo(() => {
    let result = data;
    if (searchQuery.trim()) {
      result = baselineSearch(result, searchQuery);
    }
    if (sort) {
      result = sortRecords(result, sort);
    }
    return result;
  }, [data, searchQuery, sort]);

  const handleExport = useCallback(() => {
    if (filteredAndSorted.length === 0) return;
    const headerRow = columns.map((c) => c.name).join(',');
    const rows = filteredAndSorted.map((row) =>
      columns
        .map((c) => {
          const val = row[c.name];
          if (val == null) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    );
    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProfile?.name || 'frontbench-export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSorted, columns, activeProfile]);

  const handleImportComplete = useCallback(
    (dataset: { profile: DatasetProfile; records: DataRecord[] }) => {
      setData(dataset.records);
      setColumns(dataset.profile.columns);
      setActiveProfile(dataset.profile);
      setIsLoaded(true);
    },
    []
  );

  if (!isLoaded) {
    return (
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div>
            <h2>Data Explorer</h2>
            <p className={styles.headerSubtitle}>
              Inspect, search, sort, and virtualize large datasets locally in your browser.
            </p>
          </div>
          <div className={styles.topActions}>
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              📂 Import CSV
            </Button>
            <Button variant="primary" onClick={() => handleLoadDemo(10000)}>
              ⚡ Load 10k Demo
            </Button>
          </div>
        </div>

        <EmptyState
          icon="📊"
          title="No Dataset Loaded"
          description="Load a deterministic synthetic dataset to test rendering at scale, or import your own CSV file."
          actionLabel="Load 10,000 Rows Demo"
          onAction={() => handleLoadDemo(10000)}
        />

        <ImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImportComplete={handleImportComplete}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.headerTitle}>
          <h2>Data Explorer</h2>
          <p className={styles.headerSubtitle}>
            {activeProfile?.name} — {activeProfile?.rowCount.toLocaleString()} total records
          </p>
        </div>
        <div className={styles.topActions}>
          <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)}>
            📂 Import CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleLoadDemo(1000)}>
            Load 1k
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleLoadDemo(10000)}>
            Load 10k
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleLoadDemo(50000)}>
            Load 50k
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport}>
            ⬇ Export CSV ({filteredAndSorted.length.toLocaleString()})
          </Button>
        </div>
      </div>

      <div className={styles.datasetInfoBar}>
        <div className={styles.infoTag}>
          <span>Source:</span>
          <strong>{activeProfile?.sourceType === 'synthetic' ? 'Synthetic PRNG' : 'Local CSV File'}</strong>
        </div>
        <div className={styles.infoTag}>
          <span>Columns:</span>
          <strong>{columns.length}</strong>
        </div>
        <div className={styles.infoTag}>
          <span>Matching records:</span>
          <strong>{filteredAndSorted.length.toLocaleString()}</strong>
        </div>
        <div className={styles.infoTag}>
          <span>Storage:</span>
          <strong>Client-side IndexedDB (No API upload)</strong>
        </div>
      </div>

      <div className={styles.toolbar}>
        <SearchBar value={searchQuery} onChange={handleSearchChange} />
        <span className={styles.statusText}>
          Showing {filteredAndSorted.length.toLocaleString()} of {data.length.toLocaleString()} rows
        </span>

        <div className={styles.viewModeToggle}>
          <span>Rendering Engine:</span>
          <div className={styles.segmentedControl} role="radiogroup" aria-label="Table rendering mode">
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'virtualized'}
              className={`${styles.segmentBtn} ${viewMode === 'virtualized' ? styles.segmentBtnActive : ''}`}
              onClick={() => setViewMode('virtualized')}
            >
              ⚡ Virtualized (TanStack Virtual)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'baseline'}
              className={`${styles.segmentBtn} ${viewMode === 'baseline' ? styles.segmentBtnActive : ''}`}
              onClick={() => setViewMode('baseline')}
            >
              📄 Baseline (Standard DOM)
            </button>
          </div>
        </div>
      </div>

      <Card>
        {viewMode === 'virtualized' ? (
          <VirtualizedDataTable
            data={filteredAndSorted}
            columns={columns}
            sort={sort}
            onSortChange={setSort}
          />
        ) : (
          <DataTable
            data={filteredAndSorted}
            columns={columns}
            sort={sort}
            onSortChange={setSort}
            maxRows={100}
          />
        )}
      </Card>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
