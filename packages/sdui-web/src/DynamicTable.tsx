import React from 'react';
import type { ColumnDef, DataTableResponse, FilterDef } from '@dukaandaar/sdui-core';

export interface DynamicTableProps<T> {
  data: DataTableResponse<T>;
  loading?: boolean;
  userRoles?: string[];
  onPageChange?: (newPage: number) => void;
  onSortChange?: (columnKey: string, direction: 'asc' | 'desc') => void;
  onFilterChange?: (activeFilters: Record<string, unknown>) => void;
  onRowClick?: (row: T) => void;
  onExportCsv?: () => void;
}

function visibleColumns<T>(columns: ColumnDef<T>[], userRoles: string[]): ColumnDef<T>[] {
  return columns.filter(
    (c) => !c.rolesAllowed || c.rolesAllowed.length === 0 || c.rolesAllowed.some((r) => userRoles.includes(r))
  );
}

function renderCell<T>(row: T, column: ColumnDef<T>): React.ReactNode {
  const value = (row as Record<string, unknown>)[column.key];
  if (column.type === 'money') {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric)
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: column.currency ?? 'INR' }).format(numeric)
      : String(value ?? '');
  }
  if (column.type === 'date' && value) {
    const date = new Date(value as string);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }
  return value === null || value === undefined ? '' : String(value);
}

function SimpleFilter({
  filter,
  onChange,
}: {
  filter: FilterDef;
  onChange: (key: string, value: unknown) => void;
}) {
  if (filter.type === 'SEARCH' || filter.type === 'LOOKUP') {
    return (
      <input
        placeholder={filter.placeholder ?? filter.label}
        onChange={(e) => onChange(filter.key, e.target.value)}
      />
    );
  }
  if (filter.type === 'SELECT' || filter.type === 'MULTI_SELECT') {
    return (
      <select onChange={(e) => onChange(filter.key, e.target.value)}>
        <option value="">{filter.placeholder ?? filter.label}</option>
        {(filter.options ?? []).map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  return null;
}

/** Pure rendering component: receives a fully-formed DataTableResponse via props. */
export function DynamicTable<T>({
  data,
  loading,
  userRoles = [],
  onPageChange,
  onSortChange,
  onFilterChange,
  onRowClick,
  onExportCsv,
}: DynamicTableProps<T>) {
  const columns = visibleColumns(data.columns ?? [], userRoles);
  const filters = (data.filters ?? []).filter(
    (f) => !f.rolesAllowed || f.rolesAllowed.length === 0 || f.rolesAllowed.some((r) => userRoles.includes(r))
  );

  const updateFilter = (key: string, value: unknown) => onFilterChange?.({ [key]: value });

  return (
    <div className="sdui-table-wrapper">
      {filters.length > 0 && (
        <div className="sdui-table-filters" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {filters.map((filter) => (
            <SimpleFilter key={filter.key} filter={filter} onChange={updateFilter} />
          ))}
        </div>
      )}

      <table className="sdui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ textAlign: column.align ?? 'left', cursor: column.sortable ? 'pointer' : 'default' }}
                onClick={() => column.sortable && onSortChange?.(column.key, 'asc')}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center' }}>
                Loading…
              </td>
            </tr>
          )}
          {!loading && data.content.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center' }}>
                No records
              </td>
            </tr>
          )}
          {!loading &&
            data.content.map((row, index) => (
              <tr key={index} onClick={() => onRowClick?.(row)}>
                {columns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align ?? 'left' }}>
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      <div className="sdui-table-footer" style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button disabled={data.pageNumber <= 0} onClick={() => onPageChange?.(data.pageNumber - 1)}>
          Prev
        </button>
        <span>
          Page {data.pageNumber + 1} / {Math.max(1, data.totalPages)}
        </span>
        <button disabled={data.last} onClick={() => onPageChange?.(data.pageNumber + 1)}>
          Next
        </button>
        {data.enableExport && onExportCsv && (
          <button style={{ marginLeft: 'auto' }} onClick={onExportCsv}>
            Export CSV
          </button>
        )}
      </div>
    </div>
  );
}
