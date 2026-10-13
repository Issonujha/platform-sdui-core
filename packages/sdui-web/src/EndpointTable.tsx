import React from 'react';
import type { DataTableResponse } from '@issonujha/sdui-core';
import { DynamicTable } from './DynamicTable.js';
import { useSdui } from './SduiWebProvider.js';

/**
 * Convenience wrapper: owns pagination/sort/filter state but delegates the actual
 * request to the host fetcher. The package itself performs no fetch.
 */
export function EndpointTable<T>({ endpoint }: { endpoint: string }) {
  const { apiBase = '', fetcher, userRoles } = useSdui();
  const [data, setData] = React.useState<DataTableResponse<T> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [sort, setSort] = React.useState<{ key?: string; dir: 'asc' | 'desc' }>({ dir: 'desc' });
  const [filters, setFilters] = React.useState<Record<string, unknown>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (sort.key) {
        params.set('sortBy', sort.key);
        params.set('sortDir', sort.dir.toUpperCase());
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
      });
      const result = (await fetcher(`${apiBase}${endpoint}?${params.toString()}`)) as DataTableResponse<T>;
      setData(result);
    } catch {
      setError('Could not load data');
    } finally {
      setLoading(false);
    }
  }, [apiBase, endpoint, fetcher, page, sort, filters]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <div role="alert">{error}</div>;
  if (!data) return <div>Loading…</div>;

  return (
    <DynamicTable<T>
      data={data}
      loading={loading}
      userRoles={userRoles}
      onPageChange={setPage}
      onSortChange={(key, dir) => setSort({ key, dir })}
      onFilterChange={(next) => {
        setFilters((prev) => ({ ...prev, ...next }));
        setPage(0);
      }}
    />
  );
}
