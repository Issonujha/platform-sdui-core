import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type {
  ColumnDef,
  DataTableResponse,
  FilterDef,
  TableViewMode,
  KanbanStageDef,
  StageTransitionOption,
} from '@issonujha/sdui-core';
export interface RowActionHelpers {
  isExpanded: boolean;
  toggleExpand: () => void;
  openDetail?: () => void;
}

export interface TableActionItem {
  id?: string;
  label: string;
  variant?: 'contained' | 'outlined' | 'text' | string;
  color?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  sx?: any;
  style?: React.CSSProperties;
}

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
  onExport?: (format: 'csv' | 'excel' | 'json' | 'print') => void;
  exportFormats?: Array<'csv' | 'excel' | 'json' | 'print'>;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
  pageSizeOptions?: number[];
  defaultRowsPerPage?: number;
  renderCustomCard?: (row: T, onTransition?: (targetStageKey: string) => void) => React.ReactNode;
  actions?: ((row: T, helpers: RowActionHelpers) => React.ReactNode) | ((row: T) => React.ReactNode) | React.ReactNode;
  rowActions?: ((row: T, helpers: RowActionHelpers) => React.ReactNode) | ((row: T) => React.ReactNode) | any[] | React.ReactNode;
  renderExpandedRow?: (row: T, helpers: RowActionHelpers) => React.ReactNode;
  activeFilters?: Record<string, unknown>;
  emptyMessage?: string;
  exportFilename?: string;
  exportEndpoint?: string;
  tableActions?: React.ReactNode | TableActionItem[];
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

function extractEntityDisplay(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && !Array.isArray(val)) {
    return val.label || val.name || val.displayName || val.title || val.username || val.email || val.code || val.id || '';
  }
  return String(val);
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
  onExport,
  exportFormats = ['csv', 'excel', 'json', 'print'],
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
  exportEndpoint,
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

  // Column header filter popover state
  const [activeHeaderFilterCol, setActiveHeaderFilterCol] = useState<string | null>(null);
  const headerFilterPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (headerFilterPopoverRef.current && !headerFilterPopoverRef.current.contains(event.target as Node)) {
        setActiveHeaderFilterCol(null);
      }
    }
    if (activeHeaderFilterCol) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeHeaderFilterCol]);

  // Sorting state (client-side + parent notification)
  const [internalSortBy, setInternalSortBy] = useState<string | undefined>(normalizedData.sortBy);
  const [internalSortDir, setInternalSortDir] = useState<'asc' | 'desc'>((normalizedData.sortDir as 'asc' | 'desc') || 'asc');

  // Export Dropdown & Notification State
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportMenuOpen]);

  const activeSortBy = internalSortBy !== undefined ? internalSortBy : normalizedData.sortBy;
  const activeSortDir = internalSortDir || (normalizedData.sortDir as 'asc' | 'desc') || 'asc';

  const handleSort = (columnKey: string) => {
    let nextDir: 'asc' | 'desc' = 'asc';
    if (activeSortBy === columnKey) {
      nextDir = activeSortDir === 'asc' ? 'desc' : 'asc';
    }
    setInternalSortBy(columnKey);
    setInternalSortDir(nextDir);
    onSortChange?.(columnKey, nextDir);
  };

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<any>>(() => new Set());

  const toggleRowExpansion = useCallback((rowId: any) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const renderActionContent = useCallback((row: T, rowId: any) => {
    const isExpanded = expandedRows.has(rowId);
    const toggleExpand = () => toggleRowExpansion(rowId);
    const helpers: RowActionHelpers = { isExpanded, toggleExpand };

    const actionFn = actions || rowActions;
    if (typeof actionFn === 'function') {
      try {
        return (actionFn as any)(row, helpers);
      } catch (err) {
        console.error('[DynamicTable] Error executing actions renderer:', err);
        return null;
      }
    }
    if (Array.isArray(rowActions)) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {(rowActions as any[]).map((ra, idx) => {
            if (ra.isVisible && !ra.isVisible(row)) return null;
            return (
              <button
                key={ra.id || ra.label || idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  ra.onClick?.(row);
                }}
                disabled={ra.disabled}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: ra.disabled ? 'not-allowed' : 'pointer',
                  ...ra.style,
                }}
              >
                {ra.icon && <span>{ra.icon}</span>}
                <span>{ra.label}</span>
              </button>
            );
          })}
        </div>
      );
    }
    return (actions as React.ReactNode) || null;
  }, [actions, rowActions, expandedRows, toggleRowExpansion]);

  // Dynamic cell value resolver using column key, nested dot-paths (e.g. 'shop.name'), or custom accessor
  const getCellValue = useCallback((row: any, col: ColumnDef<T>): any => {
    if (!row || !col) return '';
    if (typeof (col as any).accessor === 'function') {
      try {
        return (col as any).accessor(row);
      } catch {
        // fallback
      }
    }
    const key = col.key;
    if (!key) return '';
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
    if (key.includes('.')) {
      return key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), row);
    }
    return row[key];
  }, []);

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

  // Auto-generate filters for visible filterable columns that don't have an explicit FilterDef
  // Intelligently supports foreign keys, nested entities, and discrete options
  const effectiveFilterDefs: FilterDef[] = useMemo(() => {
    const result = [...filters];
    const registeredKeys = new Set(result.map((f) => f.key || f.columnKey));

    visibleColumns.forEach((col) => {
      if (col.filterable === false) return;
      if (registeredKeys.has(col.key)) return;

      const distinct = new Set<string>();

      (normalizedData.content || []).forEach((row: any) => {
        const rawVal = getCellValue(row, col);
        if (rawVal === undefined || rawVal === null || rawVal === '') return;
        if (Array.isArray(rawVal)) {
          rawVal.forEach((item) => {
            const s = typeof item === 'object' ? extractEntityDisplay(item) : String(item);
            if (s && s !== '[object Object]') distinct.add(s);
          });
        } else if (typeof rawVal === 'object') {
          const s = extractEntityDisplay(rawVal);
          if (s && s !== '[object Object]') distinct.add(s);
        } else {
          distinct.add(String(rawVal));
        }
      });

      const uniqueCount = distinct.size;
      const isSelect =
        col.type === 'badge' ||
        (uniqueCount > 0 && uniqueCount <= 20);

      if (isSelect) {
        result.push({
          key: col.key,
          label: col.label || (col as any).header || col.key,
          type: 'SELECT',
          columnKey: col.key,
          options: Array.from(distinct)
            .sort()
            .map((v) => ({ label: v, value: v })),
        });
      } else {
        result.push({
          key: col.key,
          label: col.label || (col as any).header || col.key,
          type: 'SEARCH',
          columnKey: col.key,
          placeholder: `Filter ${col.label || (col as any).header || col.key}…`,
        });
      }
    });

    return result;
  }, [filters, visibleColumns, normalizedData.content, getCellValue]);

  // Active filter entries
  const activeFilterEntries = useMemo(() => {
    return Object.entries(effectiveFilters).filter(
      ([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL' && v !== 'all'
    );
  }, [effectiveFilters]);

  // Active filter count
  const activeFiltersCount = activeFilterEntries.length;

  // Processed Content with client-side Search, Multi-Column Filtering, and Sorting
  const processedContent = useMemo(() => {
    let list = Array.isArray(normalizedData.content) ? [...normalizedData.content] : [];

    // 1. Search Filter (matches search against row properties & foreign object fields)
    if (activeSearch && activeSearch.trim()) {
      const q = activeSearch.trim().toLowerCase();
      list = list.filter((row: any) => {
        if (!row || typeof row !== 'object') return false;
        return Object.entries(row).some(([_, val]) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') {
            const entityStr = extractEntityDisplay(val);
            if (entityStr && entityStr.toLowerCase().includes(q)) return true;
            try {
              return JSON.stringify(val).toLowerCase().includes(q);
            } catch {
              return false;
            }
          }
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // 2. Filter Drawer & Multi-Column Filters
    if (activeFilterEntries.length > 0) {
      list = list.filter((row: any) => {
        return activeFilterEntries.every(([filterKey, filterVal]) => {
          const fltDef = effectiveFilterDefs.find((f) => f.key === filterKey || f.columnKey === filterKey);
          const colDef = columns.find((c) => c.key === filterKey || (fltDef && fltDef.columnKey === c.key));

          let rowVal = colDef ? getCellValue(row, colDef) : (row[filterKey] ?? row[filterKey.toLowerCase()]);
          if (rowVal === undefined || rowVal === null) {
            rowVal = row[filterKey] ?? row[filterKey.toLowerCase()];
          }
          if (rowVal === undefined || rowVal === null) return false;

          const filterType = fltDef?.type || (typeof filterVal === 'string' && filterVal.length > 0 ? 'SEARCH' : 'SELECT');
          const strFilter = String(filterVal).trim().toLowerCase();

          // Array row value (e.g. roles, surfaces)
          if (Array.isArray(rowVal)) {
            if (Array.isArray(filterVal)) {
              return filterVal.some((fv) => rowVal.some((rv) => {
                const s = typeof rv === 'object' ? extractEntityDisplay(rv) : String(rv);
                return s.toLowerCase() === String(fv).toLowerCase();
              }));
            }
            return rowVal.some((rv) => {
              const strRow = (typeof rv === 'object' ? extractEntityDisplay(rv) : String(rv)).toLowerCase();
              return filterType === 'SEARCH' ? strRow.includes(strFilter) : strRow === strFilter;
            });
          }

          // Array filter value
          if (Array.isArray(filterVal)) {
            const s = (typeof rowVal === 'object' ? extractEntityDisplay(rowVal) : String(rowVal)).toLowerCase();
            return filterVal.some((fv) => s === String(fv).toLowerCase());
          }

          let strRow = '';
          if (typeof rowVal === 'object') {
            strRow = (extractEntityDisplay(rowVal) + ' ' + (rowVal.id || '') + ' ' + (rowVal.email || '') + ' ' + (rowVal.code || '')).toLowerCase();
          } else {
            strRow = String(rowVal).trim().toLowerCase();
          }

          if (filterType === 'SELECT') {
            const displayStr = (typeof rowVal === 'object' ? extractEntityDisplay(rowVal) : String(rowVal)).toLowerCase();
            return displayStr === strFilter || strRow.split(',').map((s) => s.trim().toLowerCase()).includes(strFilter);
          }

          return strRow.includes(strFilter);
        });
      });
    }

    // 3. Sorting
    if (activeSortBy) {
      const col = columns.find((c) => c.key === activeSortBy);
      list.sort((a: any, b: any) => {
        let valA = typeof (col as any)?.accessor === 'function' ? (col as any).accessor(a) : a[activeSortBy];
        let valB = typeof (col as any)?.accessor === 'function' ? (col as any).accessor(b) : b[activeSortBy];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return activeSortDir === 'desc' ? valB - valA : valA - valB;
        }

        if (col?.type === 'date' || (typeof valA === 'string' && valA.match(/^\d{4}-\d{2}-\d{2}/))) {
          const timeA = new Date(valA).getTime();
          const timeB = new Date(valB).getTime();
          if (!isNaN(timeA) && !isNaN(timeB)) {
            return activeSortDir === 'desc' ? timeB - timeA : timeA - timeB;
          }
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        const comp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
        return activeSortDir === 'desc' ? -comp : comp;
      });
    }

    return list;
  }, [normalizedData.content, activeSearch, effectiveFilters, activeSortBy, activeSortDir, columns]);

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

  // Helper to extract clean display/export string from row & column dynamically
  const getExportCellValue = useCallback((row: any, col: ColumnDef<T>): string => {
    const v = getCellValue(row, col);
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') {
      if (Array.isArray(v)) {
        return v.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join('; ');
      }
      return JSON.stringify(v);
    }
    return String(v);
  }, [getCellValue]);

  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  // Multi-Format Export across CSV, Excel (.xls), JSON, and Print/PDF
  const handleExport = useCallback((format: 'csv' | 'excel' | 'json' | 'print' = 'csv') => {
    if (onExport) {
      onExport(format);
      return;
    }
    if (format === 'csv' && onExportCsv) {
      onExportCsv();
      return;
    }

    if (exportEndpoint) {
      const q = activeSearch ? `&search=${encodeURIComponent(activeSearch)}` : '';
      const url = `${exportEndpoint}${exportEndpoint.includes('?') ? '&' : '?'}format=${format}${q}`;
      window.open(url, '_blank');
      setExportNotice(`Exporting ${format.toUpperCase()} from server…`);
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    const rowsData = Array.isArray(processedContent) ? processedContent : [];
    const count = rowsData.length;
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileNameBase = `${exportFilename || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'export')}_${dateStamp}`;

    if (count === 0) {
      setExportNotice('Exported column headers template (0 records found)');
      setTimeout(() => setExportNotice(null), 4000);
    } else {
      setExportNotice(`Exported ${count} record${count === 1 ? '' : 's'} as ${format.toUpperCase()}`);
      setTimeout(() => setExportNotice(null), 3000);
    }

    // 1. CSV Format
    if (format === 'csv') {
      const headers = visibleColumns.map((c) => c.label || (c as any).header || c.key);
      const rows = rowsData.map((row) =>
        visibleColumns.map((c) => {
          const val = getExportCellValue(row, c);
          if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
      );
      const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, `${fileNameBase}.csv`);
      return;
    }

    // 2. Excel Format (.xls)
    if (format === 'excel') {
      const escapeXml = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const headersHtml = visibleColumns.map((c) => `<th style="background:#F1F5F9;color:#0F172A;font-weight:bold;border:1px solid #CBD5E1;padding:8px 12px;text-align:left;">${escapeXml(c.label || (c as any).header || c.key)}</th>`).join('');
      const rowsHtml = rowsData.map((row) =>
        `<tr>${visibleColumns.map((c) => `<td style="border:1px solid #E2E8F0;padding:6px 12px;">${escapeXml(getExportCellValue(row, c))}</td>`).join('')}</tr>`
      ).join('');
      const excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>${escapeXml(title || 'Records')}</x:Name>
                    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
          </head>
          <body>
            <table>
              <thead><tr>${headersHtml}</tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </body>
        </html>
      `.trim();
      const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      triggerDownload(blob, `${fileNameBase}.xls`);
      return;
    }

    // 3. JSON Format (.json)
    if (format === 'json') {
      const exportJson = rowsData.map((row) => {
        const item: Record<string, unknown> = {};
        visibleColumns.forEach((c) => {
          const key = c.label || c.key;
          item[key] = getExportCellValue(row, c);
        });
        return item;
      });
      const jsonString = JSON.stringify(exportJson, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      triggerDownload(blob, `${fileNameBase}.json`);
      return;
    }

    // 4. Print / PDF
    if (format === 'print') {
      const escapeXml = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (printWindow) {
        const printHeaders = visibleColumns.map((c) => `<th style="border: 1px solid #CBD5E1; padding: 8px 12px; text-align: left; background: #F8FAFC; font-weight: 700; font-size: 11px;">${escapeXml(c.label || (c as any).header || c.key)}</th>`).join('');
        const printRows = rowsData.map((row) =>
          `<tr>${visibleColumns.map((c) => `<td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 11px;">${escapeXml(getExportCellValue(row, c))}</td>`).join('')}</tr>`
        ).join('');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${escapeXml(title || 'Records Export')}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0F172A; }
                h1 { font-size: 20px; margin: 0 0 6px 0; font-weight: 800; }
                .meta { font-size: 12px; color: #64748B; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                @media print {
                  @page { margin: 10mm; }
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              <h1>${escapeXml(title || 'Records Export')}</h1>
              <div class="meta">Exported on ${new Date().toLocaleString()} · ${count} records</div>
              <table>
                <thead><tr>${printHeaders}</tr></thead>
                <tbody>${printRows}</tbody>
              </table>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      } else {
        window.print();
      }
      return;
    }
  }, [onExport, onExportCsv, processedContent, exportFilename, title, visibleColumns, getExportCellValue, triggerDownload]);

  // Filter drawer toggle column
  const toggleColumnVisibility = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Render cell content dynamically based on column.type from backend schema
  const renderCellContent = (row: T, column: ColumnDef<T>): React.ReactNode => {
    if (typeof (column as any).render === 'function') {
      const cellVal = typeof (column as any).accessor === 'function'
        ? (column as any).accessor(row)
        : (row as Record<string, unknown>)[column.key];
      return (column as any).render(cellVal, row);
    }

    const val = getCellValue(row, column);
    const type = String(column.type || 'text').toLowerCase();

    if (val === null || val === undefined || val === '') {
      return <span style={{ color: '#94A3B8' }}>—</span>;
    }

    // 1. Code / Identifier with optional stacked timestamp
    if (type === 'code') {
      const dateVal = (row as any).createdAtFormatted || (row as any).createdAt;
      return (
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0F172A', letterSpacing: '-0.01em' }}>{String(val)}</div>
          {dateVal && (
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>{String(dateVal)}</div>
          )}
        </div>
      );
    }

    // 2. Avatar with initial circle
    if (type === 'avatar') {
      const initial = (row as any).customerInitial || (String(val)[0] ? String(val)[0].toUpperCase() : 'C');
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: '#F1EFEA',
              color: '#574F47',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 800,
              border: '1px solid #DCD4C8',
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>{String(val)}</span>
        </div>
      );
    }

    // 3. Stage Pill with progression dots
    if (type === 'stage') {
      const badgeStyle = getBadgeStyle(String(val));
      const stepIdx = Number((row as any).stepIndex || 1);
      const totalSteps = Number((row as any).totalSteps || 6);

      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: '0.74rem',
              fontWeight: 800,
              backgroundColor: badgeStyle.bg,
              color: badgeStyle.text,
              border: `1px solid ${badgeStyle.border}`,
              width: 'fit-content',
            }}
          >
            {String(val).replace(/_/g, ' ')}
          </span>
          {totalSteps > 1 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingLeft: 2 }}>
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: idx + 1 <= stepIdx ? badgeStyle.text : '#E2DACF',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // 4. SLA Indicator
    if (type === 'sla') {
      const isLate = Boolean((row as any).slaBreached || String(val).toLowerCase().includes('late'));
      return (
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isLate ? '#DC2626' : '#475569' }}>
          {String(val)}
        </span>
      );
    }

    // 5. Badge (Generic & Status)
    if (type === 'badge') {
      const s = String(val || '').toUpperCase();
      const isPaid = s === 'PAID' || s === 'SUCCESS' || s === 'ACTIVE';
      const isPending = s === 'PENDING';
      const isRefund = s === 'REFUND' || s === 'FAILED' || s === 'CANCELLED';
      const bg = isPaid ? '#D1FAE5' : isPending ? '#FEF3C7' : isRefund ? '#FEE2E2' : '#F1F5F9';
      const text = isPaid ? '#047857' : isPending ? '#B45309' : isRefund ? '#B91C1C' : '#475569';
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 9999,
            fontSize: '0.7rem',
            fontWeight: 800,
            backgroundColor: bg,
            color: text,
            textTransform: 'uppercase',
          }}
        >
          {String(val).replace(/_/g, ' ')}
        </span>
      );
    }

    // 6. Money / Currency
    if (type === 'money' || type === 'currency') {
      const num = Number(val);
      const symbol = column.currency === 'USD' ? '$' : '₹';
      return (
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
          {symbol}{isNaN(num) ? String(val) : Math.round(num).toLocaleString('en-IN')}
        </span>
      );
    }

    // 7. Date / Datetime
    if (type === 'date' || type === 'datetime') {
      const d = new Date(val as string);
      if (!isNaN(d.getTime())) {
        return (
          <span style={{ fontSize: '0.78rem', color: '#475569' }}>
            {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      }
    }

    // 8. Image
    if (type === 'image') {
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

    // 9. Number
    if (type === 'number') {
      const num = Number(val);
      return (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
          {isNaN(num) ? String(val) : num.toLocaleString()}
        </span>
      );
    }

    // 10. Foreign Entity Object
    if (typeof val === 'object' && !React.isValidElement(val)) {
      const display = extractEntityDisplay(val);
      const sub = (val as any).email || (val as any).phoneNumber || (val as any).sublabel || (val as any).address;
      return (
        <div>
          <span style={{ fontSize: '0.82rem', color: '#1E293B', fontWeight: 600 }}>
            {display || '—'}
          </span>
          {sub && sub !== display && (
            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{sub}</div>
          )}
        </div>
      );
    }

    // 11. Default Text
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
              {processedContent.length > 0 && (
                <span> · <strong style={{ color: 'var(--color-primary, #6366F1)' }}>{processedContent.length.toLocaleString()}</strong> records</span>
              )}
              {exportNotice && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: '1px solid #BFDBFE',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>✓</span>
                  <span>{exportNotice}</span>
                </span>
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

          {/* Multi-Format Export Action (CSV, Excel, JSON, Print/PDF) */}
          {normalizedData.enableExport !== false && (
            <div style={{ position: 'relative' }} ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((prev) => !prev)}
                title="Export Records (CSV, Excel, JSON, Print/PDF)"
                aria-expanded={exportMenuOpen}
                aria-haspopup="true"
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: `1px solid ${exportMenuOpen ? 'var(--color-primary, #6366F1)' : 'var(--border-subtle, #E2E8F0)'}`,
                  background: exportMenuOpen ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-card, #FFFFFF)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: exportMenuOpen ? 'var(--color-primary, #6366F1)' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>⭳</span>
                <span>Export</span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    transition: 'transform 0.15s ease',
                    transform: exportMenuOpen ? 'rotate(180deg)' : 'none',
                    display: 'inline-block',
                  }}
                >
                  ▼
                </span>
              </button>

              {exportMenuOpen && (
                <div
                  className="sdui-dt-export-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: 210,
                    background: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
                    zIndex: 1050,
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {exportFormats.includes('csv') && (
                    <button
                      type="button"
                      onClick={() => {
                        setExportMenuOpen(false);
                        handleExport('csv');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F8FAFC')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <span style={{ fontSize: '1.1rem' }}>📄</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A' }}>Export as CSV</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Comma-separated (.csv)</div>
                      </div>
                    </button>
                  )}

                  {exportFormats.includes('excel') && (
                    <button
                      type="button"
                      onClick={() => {
                        setExportMenuOpen(false);
                        handleExport('excel');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F8FAFC')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <span style={{ fontSize: '1.1rem' }}>📊</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A' }}>Export as Excel</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Microsoft Excel (.xls)</div>
                      </div>
                    </button>
                  )}

                  {exportFormats.includes('json') && (
                    <button
                      type="button"
                      onClick={() => {
                        setExportMenuOpen(false);
                        handleExport('json');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F8FAFC')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <span style={{ fontSize: '1.1rem' }}>📦</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A' }}>Export as JSON</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Raw data (.json)</div>
                      </div>
                    </button>
                  )}

                  {exportFormats.includes('print') && (
                    <>
                      <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '3px 0' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setExportMenuOpen(false);
                          handleExport('print');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F8FAFC')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <span style={{ fontSize: '1.1rem' }}>🖨️</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A' }}>Print / PDF</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Formatted print view</div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
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
          {tableActions && (
            Array.isArray(tableActions) ? (
              tableActions.map((act: any, idx: number) => {
                if (React.isValidElement(act)) {
                  return React.cloneElement(act, { key: (act as any).key || idx });
                }
                if (act && typeof act === 'object') {
                  const isContained = act.variant === 'contained' || !act.variant;
                  return (
                    <button
                      key={act.id || act.label || idx}
                      type="button"
                      onClick={act.onClick}
                      disabled={act.disabled}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 10,
                        border: isContained ? 'none' : '1px solid var(--border-subtle, #CBD5E1)',
                        backgroundColor: isContained ? 'var(--color-primary, #6366F1)' : 'var(--surface-card, #FFFFFF)',
                        color: isContained ? '#FFFFFF' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: act.disabled ? 'not-allowed' : 'pointer',
                        opacity: act.disabled ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        ...act.style,
                      }}
                    >
                      {act.icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{act.icon}</span>}
                      <span>{act.label}</span>
                    </button>
                  );
                }
                return null;
              })
            ) : (
              tableActions
            )
          )}
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
                .filter((c) => !filterDrawerSearch || (c.label || (c as any).header || c.key).toLowerCase().includes(filterDrawerSearch.toLowerCase()))
                .map((col) => {
                  const isVisible = !hiddenColumns.has(col.key);
                  const boundFilter = effectiveFilterDefs.find((f) => f.key === col.key || f.columnKey === col.key);

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

      {/* ── 2.5 Active Filters Strip ── */}
      {activeFilterEntries.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            backgroundColor: 'var(--surface-subtle, #F8FAFC)',
            borderRadius: 12,
            border: '1px solid var(--border-subtle, #E2E8F0)',
            flexWrap: 'wrap',
            fontSize: '0.76rem',
          }}
        >
          <span style={{ fontWeight: 800, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>⧩</span> Active Filters:
          </span>
          {activeFilterEntries.map(([key, val]) => {
            const colDef = columns.find((c) => c.key === key);
            const fltDef = effectiveFilterDefs.find((f) => f.key === key || f.columnKey === key);
            const label = fltDef?.label || colDef?.label || (colDef as any)?.header || key;
            const displayVal = String(val);

            return (
              <span
                key={key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: 'var(--color-primary, #6366F1)',
                  fontWeight: 600,
                }}
              >
                <span>
                  {label}: <strong>{displayVal}</strong>
                </span>
                <button
                  type="button"
                  title={`Remove ${label} filter`}
                  onClick={() => {
                    const next = { ...effectiveFilters };
                    delete next[key];
                    setInternalFilters(next);
                    onFilterChange?.(next);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--color-primary, #6366F1)',
                    fontWeight: 800,
                    padding: 0,
                    fontSize: '0.8rem',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setInternalFilters({});
              onFilterChange?.({});
            }}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#EF4444',
              fontWeight: 700,
              fontSize: '0.74rem',
              marginLeft: 'auto',
            }}
          >
            Clear all filters
          </button>
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
                  const isSorted = activeSortBy === col.key;
                  const sortDir = activeSortDir?.toLowerCase();
                  const boundFilter = effectiveFilterDefs.find((f) => f.key === col.key || f.columnKey === col.key);
                  const filterVal = boundFilter ? effectiveFilters[boundFilter.key] : undefined;
                  const isFilterActive = filterVal !== undefined && filterVal !== null && filterVal !== '' && filterVal !== 'ALL' && filterVal !== 'all';
                  const isPopoverOpen = activeHeaderFilterCol === col.key;

                  return (
                    <th
                      key={col.key}
                      style={{
                        position: 'relative',
                        padding: compact ? '8px 12px' : '12px 16px',
                        fontWeight: 700,
                        color: isFilterActive ? 'var(--color-primary, #6366F1)' : '#475569',
                        fontSize: '0.74rem',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        textAlign: col.align || 'left',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                          width: '100%',
                        }}
                      >
                        <span
                          onClick={() => col.sortable !== false && handleSort(col.key)}
                          style={{
                            cursor: col.sortable !== false ? 'pointer' : 'default',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title={col.sortable !== false ? `Click to sort by ${col.label || (col as any).header || col.key}` : undefined}
                        >
                          <span>{col.label || (col as any).header || col.key}</span>
                          {col.sortable !== false && (
                            <span style={{ fontSize: '0.7rem', color: isSorted ? 'var(--color-primary, #6366F1)' : '#CBD5E1' }}>
                              {isSorted ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
                            </span>
                          )}
                        </span>

                        {/* Column Filter Icon Button */}
                        {col.filterable !== false && boundFilter && (
                          <button
                            type="button"
                            title={isFilterActive ? `Filtered by: ${filterVal} (Click to change)` : `Filter by ${col.label || col.key}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveHeaderFilterCol((prev) => (prev === col.key ? null : col.key));
                            }}
                            style={{
                              border: isFilterActive ? '1px solid var(--color-primary, #6366F1)' : '1px solid #CBD5E1',
                              background: isFilterActive ? 'rgba(99, 102, 241, 0.12)' : '#FFFFFF',
                              color: isFilterActive ? 'var(--color-primary, #6366F1)' : '#64748B',
                              borderRadius: 6,
                              padding: '2px 5px',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              lineHeight: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>⧩</span>
                            {isFilterActive && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-primary, #6366F1)',
                                }}
                              />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Column Header Floating Filter Dropdown */}
                      {isPopoverOpen && boundFilter && (
                        <div
                          ref={headerFilterPopoverRef}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: col.align === 'right' ? 'auto' : 8,
                            right: col.align === 'right' ? 8 : 'auto',
                            minWidth: 220,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 12,
                            padding: '12px 14px',
                            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.12)',
                            border: '1px solid #CBD5E1',
                            zIndex: 1100,
                            textTransform: 'none',
                            fontWeight: 'normal',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>
                              Filter {col.label || (col as any).header || col.key}
                            </span>
                            {isFilterActive && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = { ...effectiveFilters };
                                  delete next[boundFilter.key];
                                  setInternalFilters(next);
                                  onFilterChange?.(next);
                                  setActiveHeaderFilterCol(null);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#EF4444',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          {boundFilter.type === 'SELECT' ? (
                            <select
                              autoFocus
                              value={String(effectiveFilters[boundFilter.key] || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const next = { ...effectiveFilters, [boundFilter.key]: val };
                                if (!val || val === 'ALL' || val === 'all') delete next[boundFilter.key];
                                setInternalFilters(next);
                                onFilterChange?.(next);
                              }}
                              style={{
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: 8,
                                border: '1px solid #CBD5E1',
                                fontSize: '0.8rem',
                                color: '#0F172A',
                                backgroundColor: '#FFFFFF',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            >
                              <option value="">All ({col.label || (col as any).header || col.key})</option>
                              {(boundFilter.options || []).map((opt) => (
                                <option key={String(opt.value)} value={String(opt.value)}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              autoFocus
                              type="text"
                              placeholder={boundFilter.placeholder || `Filter by ${col.label || col.key}…`}
                              value={String(effectiveFilters[boundFilter.key] || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const next = { ...effectiveFilters, [boundFilter.key]: val };
                                if (!val) delete next[boundFilter.key];
                                setInternalFilters(next);
                                onFilterChange?.(next);
                              }}
                              style={{
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: 8,
                                border: '1px solid #CBD5E1',
                                fontSize: '0.8rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setActiveHeaderFilterCol(null)}
                              style={{
                                padding: '4px 12px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: 'var(--color-primary, #6366F1)',
                                color: '#FFFFFF',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
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
              ) : processedContent.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (actions || rowActions ? 1 : 0)} style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📭</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{emptyMessage || 'No records found'}</div>
                    <div style={{ fontSize: '0.76rem' }}>Try clearing filters or search terms</div>
                  </td>
                </tr>
              ) : (
                processedContent.map((row, idx) => {
                  const rowId = (row as any).id ?? (row as any)._id ?? idx;

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
                            {renderActionContent(row, rowId)}
                          </td>
                        )}
                      </tr>
                      {renderExpandedRow && expandedRows.has(rowId) && (
                        <tr>
                          <td
                            colSpan={visibleColumns.length + (actions || rowActions ? 1 : 0)}
                            style={{
                              padding: compact ? '8px 12px' : '12px 16px',
                              backgroundColor: 'rgba(99, 102, 241, 0.02)',
                              borderBottom: '1px solid #E2E8F0',
                            }}
                          >
                            {renderExpandedRow(row, {
                              isExpanded: true,
                              toggleExpand: () => toggleRowExpansion(rowId),
                            })}
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
            const stageRecords = processedContent.filter((item) => {
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
                              {renderActionContent(item, (item as any).id ?? i)}
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
          ) : processedContent.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📭</div>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{emptyMessage || 'No records found'}</div>
              <div style={{ fontSize: '0.76rem' }}>Try clearing filters or search terms</div>
            </div>
          ) : (
            processedContent.map((item, idx) => {
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
                      {renderActionContent(item, (item as any).id ?? (item as any)._id ?? idx)}
                    </div>
                  )}

                  {renderExpandedRow && expandedRows.has((item as any).id ?? (item as any)._id ?? idx) && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                      {renderExpandedRow(item, {
                        isExpanded: true,
                        toggleExpand: () => toggleRowExpansion((item as any).id ?? (item as any)._id ?? idx),
                      })}
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
            {processedContent.length > 0
              ? `${normalizedData.pageNumber * normalizedData.pageSize + 1}–${Math.min((normalizedData.pageNumber + 1) * normalizedData.pageSize, processedContent.length)} of ${processedContent.length}`
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
