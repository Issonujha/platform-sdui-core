import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type {
  ColumnDef,
  DataTableResponse,
  FilterDef,
  TableViewMode,
  KanbanStageDef,
  StageTransitionOption,
} from '@issonujha/sdui-core';

export interface DynamicTableProps<T = any> {
  data: DataTableResponse<T> | T[];
  columns?: ColumnDef<T>[];
  filters?: FilterDef[];
  loading?: boolean;
  error?: string | null;
  userRoles?: string[];
  viewMode?: TableViewMode;
  onViewModeChange?: (mode: TableViewMode) => void;
  availableViews?: TableViewMode[];
  kanbanStages?: KanbanStageDef[];
  stageKey?: string;
  canDragRecord?: boolean | ((row: T) => boolean);
  onTransitionStage?: (row: T, targetStageKey: string, option?: StageTransitionOption) => Promise<void> | void;
  onPageChange?: (newPage: number) => void;
  onRowsPerPageChange?: (newSize: number) => void;
  onSortChange?: (columnKey: string, direction: 'asc' | 'desc') => void;
  onFilterChange?: (activeFilters: Record<string, unknown>) => void;
  onSearchChange?: (searchTerm: string) => void;
  onSearch?: (searchTerm: string) => void;
  searchValue?: string;
  onRowClick?: (row: T) => void;
  onExportCsv?: () => void;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
  pageSizeOptions?: number[];
  defaultRowsPerPage?: number;
  renderCustomCard?: (row: T, onTransition?: (targetStageKey: string) => void) => React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  renderExpandedRow?: (row: T) => React.ReactNode;
  activeFilters?: Record<string, unknown>;
  emptyMessage?: string;
  exportFilename?: string;
  tableActions?: React.ReactNode;
  extraHeaderActions?: React.ReactNode;
  compact?: boolean;
  enableExport?: boolean;
  enableLiveReload?: boolean;
  defaultLiveReload?: number;
  showGlobalFilters?: boolean;
}

const STAGE_PALETTES = [
  { color: '#6366F1', bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' }, // Indigo
  { color: '#F59E0B', bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }, // Amber
  { color: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' }, // Blue
  { color: '#10B981', bg: '#D1FAE5', text: '#047857', border: '#A7F3D0' }, // Emerald
  { color: '#EF4444', bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' }, // Red
  { color: '#8B5CF6', bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' }, // Purple
  { color: '#EC4899', bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8' }, // Pink
  { color: '#14B8A6', bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4' }, // Teal
];

function formatStageLabel(code: string): string {
  if (!code) return '';
  return code
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeStageDef(raw: any, index = 0): KanbanStageDef {
  const key = String(raw.key || raw.code || raw.id || '').toUpperCase();
  const label = raw.label || raw.name || formatStageLabel(key);
  const palette = STAGE_PALETTES[index % STAGE_PALETTES.length];
  return {
    key,
    label,
    color: raw.color || palette.color,
    textColor: raw.textColor || palette.text,
    borderColor: raw.borderColor || palette.border,
    statuses: Array.isArray(raw.statuses) && raw.statuses.length > 0 ? raw.statuses : [key],
  };
}

function getRowStage<T>(row: T, stageKey?: string): string {
  if (!row) return '';
  const r = row as Record<string, unknown>;
  const val = (stageKey && r[stageKey]) || r.deliveryStatus || r.stageCode || r.stageName || r.status || r.stage || '';
  return String(val).toUpperCase();
}

function getBadgeStyle(val: string): { bg: string; text: string; border: string } {
  const s = String(val || '').toUpperCase();
  if (['ACTIVE', 'APPROVED', 'SUCCESS', 'DELIVERED', 'PAID', 'COMPLETED', 'OPEN', 'TRUE'].includes(s)) {
    return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
  }
  if (['PENDING', 'PROCESSING', 'IN_TRANSIT', 'PLACED', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'WARN', 'WARNING'].includes(s)) {
    return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' };
  }
  if (['CANCELLED', 'REJECTED', 'FAILED', 'SUSPENDED', 'BLOCKED', 'BANNED', 'ERROR', 'FALSE'].includes(s)) {
    return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
  }
  if (['SIMULATED', 'INFO', 'SELLER', 'WEB', 'EMAIL', 'SMS', 'IN_APP'].includes(s)) {
    return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
  }
  if (s.includes('OTP') || s.includes('SECURITY')) {
    return { bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF' };
  }
  return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
}

export function DynamicTable<T = any>({
  data: rawData,
  columns: customColumns,
  filters: customFilters,
  loading = false,
  error = null,
  userRoles = [],
  viewMode: controlledViewMode,
  onViewModeChange,
  availableViews: propAvailableViews,
  kanbanStages: explicitKanbanStages,
  stageKey,
  canDragRecord = true,
  onTransitionStage,
  onPageChange,
  onRowsPerPageChange,
  onSortChange,
  onFilterChange,
  onSearchChange,
  onSearch,
  searchValue: controlledSearchValue,
  onRowClick,
  onExportCsv,
  onRefresh,
  title,
  subtitle,
  pageSizeOptions = [10, 15, 25, 50, 100],
  defaultRowsPerPage = 10,
  renderCustomCard,
  actions,
  rowActions,
  renderExpandedRow,
  activeFilters,
  emptyMessage,
  exportFilename,
  tableActions,
  extraHeaderActions,
  compact = false,
  enableExport,
  enableLiveReload,
  defaultLiveReload,
  showGlobalFilters,
}: DynamicTableProps<T>) {
  // Normalize incoming data (can be DataTableResponse or Array)
  const isResponseObject = Boolean(rawData && typeof rawData === 'object' && !Array.isArray(rawData));
  const normalizedData: DataTableResponse<T> = useMemo(() => {
    if (isResponseObject) {
      const resp = rawData as DataTableResponse<T>;
      return {
        content: Array.isArray(resp.content) ? resp.content : [],
        totalElements: typeof resp.totalElements === 'number' ? resp.totalElements : (resp.content?.length || 0),
        totalPages: typeof resp.totalPages === 'number' ? resp.totalPages : 1,
        pageNumber: typeof resp.pageNumber === 'number' ? resp.pageNumber : 0,
        pageSize: typeof resp.pageSize === 'number' ? resp.pageSize : defaultRowsPerPage,
        last: typeof resp.last === 'boolean' ? resp.last : true,
        columns: Array.isArray(resp.columns) ? resp.columns : [],
        filters: Array.isArray(resp.filters) ? resp.filters : [],
        sortBy: resp.sortBy,
        sortDir: resp.sortDir,
        stages: resp.stages,
        enableExport: typeof enableExport === 'boolean' ? enableExport : resp.enableExport,
        enableLiveReload: typeof enableLiveReload === 'boolean' ? enableLiveReload : resp.enableLiveReload,
        enableColumnVisibility: resp.enableColumnVisibility,
      };
    }
    const arr = Array.isArray(rawData) ? rawData : [];
    return {
      content: arr,
      totalElements: arr.length,
      totalPages: 1,
      pageNumber: 0,
      pageSize: arr.length || defaultRowsPerPage,
      last: true,
      columns: [],
      filters: [],
      enableExport: typeof enableExport === 'boolean' ? enableExport : true,
      enableLiveReload: typeof enableLiveReload === 'boolean' ? enableLiveReload : true,
    };
  }, [rawData, isResponseObject, defaultRowsPerPage, enableExport, enableLiveReload]);

  // Dynamic View Mode
  const [internalViewMode, setInternalViewMode] = useState<TableViewMode>('table');
  const activeView: TableViewMode = controlledViewMode ?? internalViewMode;

  const setViewMode = (mode: TableViewMode) => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  // Search state
  const [internalSearch, setInternalSearch] = useState('');
  const activeSearch = controlledSearchValue !== undefined ? controlledSearchValue : internalSearch;

  const handleSearchInput = (val: string) => {
    setInternalSearch(val);
    onSearchChange?.(val);
    onSearch?.(val);
  };

  // Filter drawer / panel state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterDrawerSearch, setFilterDrawerSearch] = useState('');
  const [internalFilters, setInternalFilters] = useState<Record<string, unknown>>({});
  const effectiveFilters = useMemo(() => {
    return activeFilters !== undefined ? activeFilters : internalFilters;
  }, [activeFilters, internalFilters]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Columns resolution
  const columns: ColumnDef<T>[] = useMemo(() => {
    let base = customColumns && customColumns.length > 0
      ? customColumns
      : normalizedData.columns && normalizedData.columns.length > 0
      ? normalizedData.columns
      : [];

    if (base.length === 0 && normalizedData.content.length > 0) {
      const sample = normalizedData.content[0] as Record<string, unknown>;
      base = Object.keys(sample).slice(0, 8).map((k) => ({
        key: k,
        label: formatStageLabel(k),
        type: typeof sample[k] === 'number' ? 'number' : 'text',
        sortable: true,
      }));
    }

    return base.filter(
      (c) => !c.rolesAllowed || c.rolesAllowed.length === 0 || c.rolesAllowed.some((r) => userRoles.includes(r))
    );
  }, [customColumns, normalizedData.columns, normalizedData.content, userRoles]);

  const visibleColumns = useMemo(() => {
    return columns.filter((c) => !hiddenColumns.has(c.key));
  }, [columns, hiddenColumns]);

  // Filters resolution
  const filters: FilterDef[] = useMemo(() => {
    const base = customFilters && customFilters.length > 0 ? customFilters : normalizedData.filters || [];
    return base.filter(
      (f) => !f.rolesAllowed || f.rolesAllowed.length === 0 || f.rolesAllowed.some((r) => userRoles.includes(r))
    );
  }, [customFilters, normalizedData.filters, userRoles]);

  // Dynamic Kanban Stages
  const kanbanStages: KanbanStageDef[] = useMemo(() => {
    if (explicitKanbanStages && explicitKanbanStages.length > 0) {
      return explicitKanbanStages.map((s, i) => normalizeStageDef(s, i));
    }
    if (Array.isArray(normalizedData.stages) && normalizedData.stages.length > 0) {
      return normalizedData.stages.map((s, i) => normalizeStageDef(s, i));
    }
    // Derive dynamically from content
    const stageMap = new Map<string, { label: string }>();
    const ordered: string[] = [];
    normalizedData.content.forEach((item) => {
      const key = getRowStage(item, stageKey);
      if (key && !stageMap.has(key)) {
        const label = (item as any).stageName || formatStageLabel(key);
        stageMap.set(key, { label });
        ordered.push(key);
      }
    });
    if (ordered.length === 0) {
      return [normalizeStageDef({ key: 'DEFAULT', label: 'All Records' }, 0)];
    }
    return ordered.map((k, idx) => {
      const info = stageMap.get(k)!;
      return normalizeStageDef({ key: k, label: info.label }, idx);
    });
  }, [explicitKanbanStages, normalizedData.stages, normalizedData.content, stageKey]);

  // Available Views
  const availableViews: TableViewMode[] = useMemo(() => {
    if (propAvailableViews && propAvailableViews.length > 0) {
      return propAvailableViews;
    }
    return ['table', 'kanban', 'cards'];
  }, [propAvailableViews]);

  // Drag and drop state for Kanban
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const isDraggable = (row: T) => {
    if (typeof canDragRecord === 'function') return canDragRecord(row);
    return Boolean(canDragRecord);
  };

  const handleDragStart = (e: React.DragEvent, item: T) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', String((item as any).id ?? ''));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) setDragOverCol(colKey);
  };

  const handleDrop = async (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedItem) return;
    const currentStage = getRowStage(draggedItem, stageKey);
    if (currentStage !== colKey && onTransitionStage) {
      await onTransitionStage(draggedItem, colKey);
    }
    setDraggedItem(null);
  };

  // Export CSV
  const handleExport = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }
    if (!normalizedData.content || normalizedData.content.length === 0) return;
    const headers = visibleColumns.map((c) => c.label || (c as any).header || c.key);
    const rows = normalizedData.content.map((row) =>
      visibleColumns.map((c) => {
        const v = typeof (c as any).accessor === 'function'
          ? (c as any).accessor(row)
          : (row as any)[c.key];
        return typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      })
    );
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFilename || title || 'export'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active filter count
  const activeFiltersCount = Object.keys(effectiveFilters).filter((k) => effectiveFilters[k] !== '' && effectiveFilters[k] !== null && effectiveFilters[k] !== undefined).length;

  // Filter drawer toggle column
  const toggleColumnVisibility = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Render cell content based on ColumnDef
  const renderCellContent = (row: T, column: ColumnDef<T>): React.ReactNode => {
    if (typeof (column as any).render === 'function') {
      const cellVal = typeof (column as any).accessor === 'function'
        ? (column as any).accessor(row)
        : (row as Record<string, unknown>)[column.key];
      return (column as any).render(cellVal, row);
    }

    const val = typeof (column as any).accessor === 'function'
      ? (column as any).accessor(row)
      : (row as Record<string, unknown>)[column.key];
    const type = String(column.type || '').toLowerCase();
    const keyLower = String(column.key || '').toLowerCase();

    if (val === null || val === undefined || val === '') {
      return <span style={{ color: '#94A3B8' }}>—</span>;
    }

    if (type === 'badge' || keyLower === 'status' || keyLower === 'role' || keyLower.includes('stage')) {
      const badgeStyle = getBadgeStyle(String(val));
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: 9999,
            fontSize: '0.72rem',
            fontWeight: 700,
            backgroundColor: badgeStyle.bg,
            color: badgeStyle.text,
            border: `1px solid ${badgeStyle.border}`,
            letterSpacing: '0.01em',
            textTransform: 'capitalize',
          }}
        >
          {String(val).replace(/_/g, ' ')}
        </span>
      );
    }

    if (type === 'money' || keyLower.includes('amount') || keyLower.includes('price') || keyLower.includes('total')) {
      const num = Number(val);
      const symbol = column.currency === 'USD' ? '$' : '₹';
      return (
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', fontWeight: 800, color: '#0F172A' }}>
          {symbol}{isNaN(num) ? String(val) : num.toLocaleString('en-IN')}
        </span>
      );
    }

    if (type === 'date' || keyLower.includes('date') || keyLower.includes('at') || keyLower === 'timestamp') {
      const d = new Date(val as string);
      if (!isNaN(d.getTime())) {
        return (
          <span style={{ fontSize: '0.78rem', color: '#475569' }}>
            {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      }
    }

    if (type === 'image' || keyLower.includes('avatar') || keyLower.includes('logo')) {
      const src = String(val);
      if (src.startsWith('http') || src.startsWith('/')) {
        return (
          <img
            src={src}
            alt="thumbnail"
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0' }}
          />
        );
      }
    }

    return (
      <span style={{ fontSize: '0.82rem', color: '#1E293B', fontWeight: 500 }}>
        {String(val)}
      </span>
    );
  };

  return (
    <div
      className="sdui-dynamic-table-root"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ── 1. Top Header Toolbar ── */}
      <div
        className="sdui-dt-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 18px',
          background: 'var(--surface-card, #FFFFFF)',
          borderRadius: 16,
          border: '1px solid var(--border-subtle, #E2E8F0)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 6px 20px rgba(15, 23, 42, 0.02)',
        }}
      >
        <div style={{ minWidth: 200 }}>
          {title && (
            <h2 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', letterSpacing: '-0.02em' }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <div style={{ marginTop: 3, fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', fontWeight: 500 }}>
              {subtitle}
              {normalizedData.totalElements > 0 && (
                <span> · <strong style={{ color: 'var(--color-primary, #6366F1)' }}>{normalizedData.totalElements.toLocaleString()}</strong> records</span>
              )}
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--surface-subtle, #F8FAFC)',
              border: '1px solid var(--border-subtle, #E2E8F0)',
              borderRadius: 10,
              padding: '4px 10px',
              gap: 6,
              minWidth: 180,
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>🔍</span>
            <input
              type="text"
              placeholder="Search records…"
              value={activeSearch}
              onChange={(e) => handleSearchInput(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.8rem',
                color: '#0F172A',
                width: '100%',
              }}
            />
            {activeSearch && (
              <button
                type="button"
                onClick={() => handleSearchInput('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  fontSize: '0.82rem',
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Segmented View Switcher */}
          {availableViews.length > 1 && (
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--surface-subtle, #F8FAFC)',
                border: '1px solid var(--border-subtle, #E2E8F0)',
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}
            >
              {availableViews.includes('table') && (
                <button
                  type="button"
                  title="Table View"
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: activeView === 'table' ? 'var(--surface-card, #FFFFFF)' : 'transparent',
                    color: activeView === 'table' ? 'var(--color-primary, #6366F1)' : '#64748B',
                    boxShadow: activeView === 'table' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>☰</span>
                  <span>Table</span>
                </button>
              )}
              {availableViews.includes('kanban') && (
                <button
                  type="button"
                  title="Kanban Board"
                  onClick={() => setViewMode('kanban')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: activeView === 'kanban' ? 'var(--surface-card, #FFFFFF)' : 'transparent',
                    color: activeView === 'kanban' ? 'var(--color-primary, #6366F1)' : '#64748B',
                    boxShadow: activeView === 'kanban' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>⊞</span>
                  <span>Kanban</span>
                </button>
              )}
              {availableViews.includes('cards') && (
                <button
                  type="button"
                  title="Cards Grid"
                  onClick={() => setViewMode('cards')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: activeView === 'cards' ? 'var(--surface-card, #FFFFFF)' : 'transparent',
                    color: activeView === 'cards' ? 'var(--color-primary, #6366F1)' : '#64748B',
                    boxShadow: activeView === 'cards' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>▦</span>
                  <span>Cards</span>
                </button>
              )}
            </div>
          )}

          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Records"
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid var(--border-subtle, #E2E8F0)',
                background: 'var(--surface-card, #FFFFFF)',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>↻</span>
              <span>Refresh</span>
            </button>
          )}

          {/* Export Action */}
          {normalizedData.enableExport !== false && (
            <button
              type="button"
              onClick={handleExport}
              title="Export Records CSV"
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid var(--border-subtle, #E2E8F0)',
                background: 'var(--surface-card, #FFFFFF)',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>⭳</span>
              <span>Export</span>
            </button>
          )}

          {/* Filters & Columns Drawer Button */}
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(true)}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: `1px solid ${activeFiltersCount > 0 ? 'var(--color-primary, #6366F1)' : 'var(--border-subtle, #E2E8F0)'}`,
              background: activeFiltersCount > 0 ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-card, #FFFFFF)',
              color: activeFiltersCount > 0 ? 'var(--color-primary, #6366F1)' : '#0F172A',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚙</span>
            <span>Filters & Columns</span>
            {activeFiltersCount > 0 && (
              <span
                style={{
                  background: 'var(--color-primary, #6366F1)',
                  color: '#FFFFFF',
                  borderRadius: 9999,
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>

          {extraHeaderActions}
          {tableActions}
        </div>
      </div>

      {/* ── Slide-Out Filters & Columns Drawer ── */}
      {filterDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setFilterDrawerOpen(false)}
        >
          <div
            style={{
              width: 380,
              maxWidth: '90vw',
              height: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.16)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Filters & Columns</h3>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                  {visibleColumns.length} of {columns.length} columns visible
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Search */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <input
                type="text"
                placeholder="Find a column or filter…"
                value={filterDrawerSearch}
                onChange={(e) => setFilterDrawerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Column Visibility & Filters List */}
            <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Columns & Active Dimensions
              </div>

              {columns
                .filter((c) => !filterDrawerSearch || c.label.toLowerCase().includes(filterDrawerSearch.toLowerCase()))
                .map((col) => {
                  const isVisible = !hiddenColumns.has(col.key);
                  const boundFilter = filters.find((f) => f.key === col.key || f.columnKey === col.key);

                  return (
                    <div
                      key={col.key}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid #E2E8F0',
                        backgroundColor: isVisible ? '#FFFFFF' : '#F8FAFC',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: isVisible ? '#0F172A' : '#94A3B8' }}>
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleColumnVisibility(col.key)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>{col.label}</span>
                        </label>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                          {col.type || 'text'}
                        </span>
                      </div>

                      {/* Filter input if column is filterable */}
                      {boundFilter && isVisible && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #E2E8F0' }}>
                          {boundFilter.type === 'SELECT' ? (
                            <select
                              value={String(effectiveFilters[boundFilter.key] || '')}
                              onChange={(e) => {
                                const next = { ...effectiveFilters, [boundFilter.key]: e.target.value };
                                if (!e.target.value) delete next[boundFilter.key];
                                setInternalFilters(next);
                                onFilterChange?.(next);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                                fontSize: '0.78rem',
                                color: '#0F172A',
                                backgroundColor: '#FFFFFF',
                              }}
                            >
                              <option value="">All {boundFilter.label}</option>
                              {(boundFilter.options || []).map((opt) => (
                                <option key={String(opt.value)} value={String(opt.value)}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder={`Filter by ${boundFilter.label}…`}
                              value={String(effectiveFilters[boundFilter.key] || '')}
                              onChange={(e) => {
                                const next = { ...effectiveFilters, [boundFilter.key]: e.target.value };
                                if (!e.target.value) delete next[boundFilter.key];
                                setInternalFilters(next);
                                onFilterChange?.(next);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                                fontSize: '0.78rem',
                                boxSizing: 'border-box',
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setInternalFilters({});
                  setHiddenColumns(new Set());
                  onFilterChange?.({});
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#EF4444',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-primary, #6366F1)',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Error Display ── */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            fontSize: '0.84rem',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* ── 3. TABLE VIEW ── */}
      {activeView === 'table' && (
        <div
          className="sdui-dt-surface"
          style={{
            width: '100%',
            overflowX: 'auto',
            background: 'var(--surface-card, #FFFFFF)',
            borderRadius: 16,
            border: '1px solid var(--border-subtle, #E2E8F0)',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 6px 20px rgba(15, 23, 42, 0.02)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-subtle, #E2E8F0)' }}>
                {visibleColumns.map((col) => {
                  const isSorted = normalizedData.sortBy === col.key;
                  const sortDir = normalizedData.sortDir?.toLowerCase();

                  return (
                    <th
                      key={col.key}
                      style={{
                        padding: compact ? '8px 12px' : '12px 16px',
                        fontWeight: 700,
                        color: '#475569',
                        fontSize: '0.74rem',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        textAlign: col.align || 'left',
                        cursor: col.sortable !== false ? 'pointer' : 'default',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => col.sortable !== false && onSortChange?.(col.key, sortDir === 'asc' ? 'desc' : 'asc')}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span>{col.label || (col as any).header || col.key}</span>
                        {col.sortable !== false && (
                          <span style={{ fontSize: '0.7rem', color: isSorted ? 'var(--color-primary, #6366F1)' : '#CBD5E1' }}>
                            {isSorted ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {Boolean(actions || rowActions) && (
                  <th
                    style={{
                      padding: compact ? '8px 12px' : '12px 16px',
                      fontWeight: 800,
                      color: '#475569',
                      fontSize: '0.74rem',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      textAlign: 'right',
                    }}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length + (actions || rowActions ? 1 : 0)} style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>⏳</div>
                    <div style={{ fontWeight: 600 }}>Loading records…</div>
                  </td>
                </tr>
              ) : normalizedData.content.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (actions || rowActions ? 1 : 0)} style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📭</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{emptyMessage || 'No records found'}</div>
                    <div style={{ fontSize: '0.76rem' }}>Try clearing filters or search terms</div>
                  </td>
                </tr>
              ) : (
                normalizedData.content.map((row, idx) => {
                  const rowId = (row as any).id || idx;

                  return (
                    <React.Fragment key={rowId}>
                      <tr
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('a') || target.closest('select')) return;
                          onRowClick?.(row);
                        }}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          cursor: onRowClick ? 'pointer' : 'default',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.04)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {visibleColumns.map((col) => (
                          <td
                            key={col.key}
                            style={{
                              padding: compact ? '8px 12px' : '12px 16px',
                              textAlign: col.align || 'left',
                              verticalAlign: 'middle',
                            }}
                          >
                            {renderCellContent(row, col)}
                          </td>
                        ))}
                        {Boolean(actions || rowActions) && (
                          <td
                            style={{
                              padding: compact ? '8px 12px' : '12px 16px',
                              textAlign: 'right',
                              verticalAlign: 'middle',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(actions || rowActions)!(row)}
                          </td>
                        )}
                      </tr>
                      {renderExpandedRow && (
                        <tr>
                          <td
                            colSpan={visibleColumns.length + (actions || rowActions ? 1 : 0)}
                            style={{
                              padding: compact ? '8px 12px' : '12px 16px',
                              backgroundColor: 'rgba(99, 102, 241, 0.02)',
                              borderBottom: '1px solid #E2E8F0',
                            }}
                          >
                            {renderExpandedRow(row)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 4. KANBAN BOARD VIEW ── */}
      {activeView === 'kanban' && (
        <div
          className="sdui-kanban-board"
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 14,
            minHeight: 520,
            alignItems: 'stretch',
          }}
        >
          {kanbanStages.map((stage) => {
            const isColOver = dragOverCol === stage.key;
            const stageRecords = normalizedData.content.filter((item) => {
              const itemStage = getRowStage(item, stageKey);
              if (stage.statuses && stage.statuses.length > 0) {
                return stage.statuses.includes(itemStage) || itemStage === stage.key;
              }
              return itemStage === stage.key;
            });

            return (
              <div
                key={stage.key}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, stage.key)}
                style={{
                  flex: '0 0 310px',
                  background: isColOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-subtle, #F8FAFC)',
                  border: `1px ${isColOver ? 'dashed var(--color-primary, #6366F1)' : 'solid var(--border-subtle, #E2E8F0)'}`,
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 280px)',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-subtle, #E2E8F0)',
                    background: 'var(--surface-card, #FFFFFF)',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    borderTop: `3px solid ${stage.color || '#6366F1'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: stage.color || '#6366F1',
                      }}
                    />
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0F172A' }}>{stage.label}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'var(--surface-subtle, #F8FAFC)',
                      color: '#64748B',
                      border: '1px solid var(--border-subtle, #E2E8F0)',
                    }}
                  >
                    {stageRecords.length}
                  </span>
                </div>

                {/* Card List in Column */}
                <div
                  style={{
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    overflowY: 'auto',
                    flex: 1,
                  }}
                >
                  {stageRecords.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem', fontStyle: 'italic' }}>
                      No records in this stage
                    </div>
                  ) : (
                    stageRecords.map((item, i) => {
                      const draggable = isDraggable(item);
                      const isDragged = draggedItem && (draggedItem as any).id === (item as any).id;
                      const allowedNext: StageTransitionOption[] = (item as any).allowedNextTransitions || [];

                      if (renderCustomCard) {
                        return (
                          <div
                            key={(item as any).id ?? i}
                            draggable={draggable}
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={() => setDraggedItem(null)}
                            onClick={() => onRowClick?.(item)}
                          >
                            {renderCustomCard(item, (target) => onTransitionStage?.(item, target))}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={(item as any).id ?? i}
                          draggable={draggable}
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={() => setDraggedItem(null)}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('select')) return;
                            onRowClick?.(item);
                          }}
                          style={{
                            background: 'var(--surface-card, #FFFFFF)',
                            border: '1px solid var(--border-subtle, #E2E8F0)',
                            borderRadius: 12,
                            padding: '12px 14px',
                            cursor: draggable ? 'grab' : onRowClick ? 'pointer' : 'default',
                            opacity: isDragged ? 0.4 : 1,
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0F172A', letterSpacing: '-0.01em' }}>
                              {(item as any).code || `#${String((item as any).id || i + 1).slice(0, 8)}`}
                            </span>
                            {((item as any).stageCode || (item as any).deliveryStatus || (item as any).status) && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 9999,
                                  backgroundColor: getBadgeStyle((item as any).stageCode || (item as any).deliveryStatus || (item as any).status).bg,
                                  color: getBadgeStyle((item as any).stageCode || (item as any).deliveryStatus || (item as any).status).text,
                                  border: `1px solid ${getBadgeStyle((item as any).stageCode || (item as any).deliveryStatus || (item as any).status).border}`,
                                }}
                              >
                                {String((item as any).stageName || (item as any).stageCode || (item as any).deliveryStatus || (item as any).status).replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>

                          {((item as any).customerName || (item as any).storeName) && (
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E293B', marginBottom: 2 }}>
                              {(item as any).customerName || (item as any).storeName}
                            </div>
                          )}

                          {(item as any).itemsSummary && (
                            <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 6 }}>
                              {(item as any).itemsSummary}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            {(item as any).totalAmount !== undefined && (
                              <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--color-primary, #6366F1)', fontFamily: 'ui-monospace, monospace' }}>
                                ₹{Number((item as any).totalAmount || 0).toLocaleString('en-IN')}
                              </span>
                            )}
                            {(item as any).createdAt && (
                              <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                                {new Date((item as any).createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Quick Transition Action Buttons */}
                          {allowedNext.length > 0 && onTransitionStage && (
                            <div
                              style={{
                                marginTop: 8,
                                paddingTop: 8,
                                borderTop: '1px solid #F1F5F9',
                                display: 'flex',
                                gap: 4,
                                flexWrap: 'wrap',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {allowedNext.map((opt) => (
                                <button
                                  key={opt.id || opt.code}
                                  type="button"
                                  onClick={() => onTransitionStage(item, opt.code || opt.id, opt)}
                                  style={{
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 9999,
                                    border: '1px solid #BFDBFE',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    cursor: 'pointer',
                                  }}
                                >
                                  → {opt.name || opt.code?.replace(/_/g, ' ')}
                                </button>
                              ))}
                            </div>
                          )}

                          {Boolean(actions || rowActions) && (
                            <div
                              style={{
                                marginTop: 6,
                                paddingTop: 6,
                                borderTop: '1px solid #F1F5F9',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 4,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {(actions || rowActions)!(item)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. CARDS GRID VIEW ── */}
      {activeView === 'cards' && (
        <div
          className="sdui-cards-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 12,
          }}
        >
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: '#64748B' }}>
              Loading cards…
            </div>
          ) : normalizedData.content.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📭</div>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{emptyMessage || 'No records found'}</div>
              <div style={{ fontSize: '0.76rem' }}>Try clearing filters or search terms</div>
            </div>
          ) : (
            normalizedData.content.map((item, idx) => {
              const currentStage = getRowStage(item, stageKey);
              const allowedNext: StageTransitionOption[] = (item as any).allowedNextTransitions || [];

              if (renderCustomCard) {
                return (
                  <div key={(item as any).id ?? idx} onClick={() => onRowClick?.(item)}>
                    {renderCustomCard(item, (target) => onTransitionStage?.(item, target))}
                  </div>
                );
              }

              return (
                <div
                  key={(item as any).id ?? idx}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) return;
                    onRowClick?.(item);
                  }}
                  style={{
                    background: 'var(--surface-card, #FFFFFF)',
                    border: '1px solid var(--border-subtle, #E2E8F0)',
                    borderRadius: 14,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    cursor: onRowClick ? 'pointer' : 'default',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>
                      {(item as any).code || `#${String((item as any).id || idx + 1).slice(0, 8)}`}
                    </span>
                    {currentStage && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          backgroundColor: getBadgeStyle(currentStage).bg,
                          color: getBadgeStyle(currentStage).text,
                          border: `1px solid ${getBadgeStyle(currentStage).border}`,
                        }}
                      >
                        {currentStage.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {((item as any).customerName || (item as any).storeName) && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                      {(item as any).customerName || (item as any).storeName}
                    </div>
                  )}

                  {(item as any).itemsSummary && (
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {(item as any).itemsSummary}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                      paddingTop: 10,
                      borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    {(item as any).totalAmount !== undefined && (
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-primary, #6366F1)', fontFamily: 'ui-monospace, monospace' }}>
                        ₹{Number((item as any).totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    )}

                    {allowedNext.length > 0 && onTransitionStage && (
                      <button
                        type="button"
                        onClick={() => onTransitionStage(item, allowedNext[0].code || allowedNext[0].id, allowedNext[0])}
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 9999,
                          border: '1px solid #BFDBFE',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          cursor: 'pointer',
                        }}
                      >
                        → {allowedNext[0].name || allowedNext[0].code?.replace(/_/g, ' ')}
                      </button>
                    )}
                  </div>

                  {Boolean(actions || rowActions) && (
                    <div
                      style={{
                        marginTop: 6,
                        paddingTop: 8,
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 6,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(actions || rowActions)!(item)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── 6. Bottom Pagination Footer ── */}
      <div
        className="sdui-dt-footer"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--surface-card, #FFFFFF)',
          borderRadius: 14,
          border: '1px solid var(--border-subtle, #E2E8F0)',
          fontSize: '0.78rem',
          color: '#64748B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Rows per page:</span>
          <select
            value={normalizedData.pageSize}
            onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
            style={{
              padding: '3px 6px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: '0.78rem',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
            }}
          >
            {pageSizeOptions.map((sz) => (
              <option key={sz} value={sz}>{sz}</option>
            ))}
          </select>
          <span>
            {normalizedData.totalElements > 0
              ? `${normalizedData.pageNumber * normalizedData.pageSize + 1}–${Math.min((normalizedData.pageNumber + 1) * normalizedData.pageSize, normalizedData.totalElements)} of ${normalizedData.totalElements}`
              : '0 records'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            disabled={normalizedData.pageNumber <= 0}
            onClick={() => onPageChange?.(normalizedData.pageNumber - 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: normalizedData.pageNumber <= 0 ? 'not-allowed' : 'pointer',
              opacity: normalizedData.pageNumber <= 0 ? 0.4 : 1,
            }}
          >
            ‹ Prev
          </button>
          <span style={{ fontSize: '0.78rem', color: '#0F172A', fontWeight: 600 }}>
            Page {normalizedData.pageNumber + 1} of {Math.max(1, normalizedData.totalPages)}
          </span>
          <button
            type="button"
            disabled={normalizedData.last}
            onClick={() => onPageChange?.(normalizedData.pageNumber + 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: normalizedData.last ? 'not-allowed' : 'pointer',
              opacity: normalizedData.last ? 0.4 : 1,
            }}
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}

export default DynamicTable;
