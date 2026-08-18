import { useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DataRecord, ColumnSchema, SortConfig } from '../../types';
import styles from './VirtualizedDataTable.module.css';

interface VirtualizedDataTableProps {
  data: DataRecord[];
  columns: ColumnSchema[];
  sort: SortConfig | null;
  onSortChange: (sort: SortConfig | null) => void;
}

export function VirtualizedDataTable({
  data,
  columns,
  sort,
  onSortChange,
}: VirtualizedDataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const tableColumns = useMemo<ColumnDef<DataRecord>[]>(
    () =>
      columns.map((col) => ({
        accessorKey: col.name,
        header: col.name,
        cell: (info) => {
          const value = info.getValue();
          if (value == null) return <span className={styles.nullValue}>null</span>;
          if (col.type === 'number') return Number(value).toLocaleString();
          return String(value);
        },
      })),
    [columns]
  );

  const sorting = useMemo<SortingState>(
    () => (sort ? [{ id: sort.column, desc: sort.direction === 'desc' }] : []),
    [sort]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      if (newSorting.length === 0) {
        onSortChange(null);
      } else {
        onSortChange({
          column: newSorting[0].id,
          direction: newSorting[0].desc ? 'desc' : 'asc',
        });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    getRowId: (row) => row.id,
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const mountedRowCount = virtualItems.length;
  const estimatedDomNodes = mountedRowCount * (columns.length + 1) + columns.length + 5;

  return (
    <div className={styles.container}>
      <div className={styles.metricsBar} role="status" aria-live="polite">
        <span>⚡ <strong>Virtualized Table (Optimized)</strong></span>
        <div className={styles.metricsMetrics}>
          <span className={styles.metricItem}>
            Total Rows: <strong>{data.length.toLocaleString()}</strong>
          </span>
          <span className={styles.metricItem}>
            Mounted Rows: <strong>{mountedRowCount}</strong>
          </span>
          <span className={styles.metricItem}>
            Active DOM Nodes: <strong>~{estimatedDomNodes.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      <div
        ref={parentRef}
        className={styles.tableViewport}
        tabIndex={0}
        role="region"
        aria-label="Virtualized data table viewport"
      >
        <div
          className={styles.virtualTable}
          role="table"
          aria-rowcount={rows.length}
          aria-colcount={columns.length}
        >
          <div className={styles.thead} role="rowgroup">
            {table.getHeaderGroups().map((headerGroup) => (
              <div key={headerGroup.id} role="row" style={{ display: 'flex', width: '100%' }}>
                {headerGroup.headers.map((header) => (
                  <div
                    key={header.id}
                    className={styles.th}
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={
                      sort?.column === header.id
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()?.(e);
                      }
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {sort?.column === header.id && (
                      <span aria-hidden="true" className={styles.sortIcon}>
                        {sort.direction === 'asc' ? ' ▲' : ' ▼'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            role="rowgroup"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={row.id}
                  className={styles.virtualRow}
                  role="row"
                  aria-rowindex={virtualRow.index + 1}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className={styles.td}
                      role="cell"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
