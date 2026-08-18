import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { DataRecord, ColumnSchema, SortConfig } from '../../types';
import styles from './DataTable.module.css';

interface DataTableProps {
  data: DataRecord[];
  columns: ColumnSchema[];
  sort: SortConfig | null;
  onSortChange: (sort: SortConfig | null) => void;
  maxRows?: number;
}

export function DataTable({ data, columns, sort, onSortChange, maxRows = 100 }: DataTableProps) {
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

  const displayData = useMemo(
    () => (data.length > maxRows ? data.slice(0, maxRows) : data),
    [data, maxRows]
  );

  const table = useReactTable({
    data: displayData,
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

  return (
    <div className={styles.tableContainer}>
      {data.length > maxRows && (
        <p className={styles.truncationNote} role="status">
          Showing bounded preview of {maxRows.toLocaleString()} of {data.length.toLocaleString()} records
          (Standard DOM rendering). Switch to <strong>Virtualized Table</strong> to browse all rows at 60 FPS.
        </p>
      )}
      <table className={styles.table} aria-label="Data records">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={styles.th}
                  onClick={header.column.getToggleSortingHandler()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      header.column.getToggleSortingHandler()?.(e);
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={
                    sort?.column === header.id
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {sort?.column === header.id && (
                    <span aria-hidden="true" className={styles.sortIcon}>
                      {sort.direction === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={styles.tr}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={styles.td}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
