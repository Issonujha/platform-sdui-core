import React, { useState } from 'react';
import type {
  ColumnDef,
  DataTableResponse,
  FilterDef,
  TableViewMode,
  KanbanStageDef,
  StageTransitionOption,
} from '@issonujha/sdui-core';

export interface DynamicTableProps<T = any> {
  data: DataTableResponse<T>;
  loading?: boolean;
  userRoles?: string[];
  viewMode?: TableViewMode;
  onViewModeChange?: (mode: TableViewMode) => void;
  availableViews?: TableViewMode[];
  kanbanStages?: KanbanStageDef[];
  stageKey?: string;
  canDragRecord?: boolean | ((row: T) => boolean);
  onTransitionStage?: (row: T, targetStageKey: string, option?: StageTransitionOption) => Promise<void> | void;
  onPageChange?: (newPage: number) => void;
  onSortChange?: (columnKey: string, direction: 'asc' | 'desc') => void;
  onFilterChange?: (activeFilters: Record<string, unknown>) => void;
  onSearchChange?: (searchTerm: string) => void;
  searchValue?: string;
  onRowClick?: (row: T) => void;
  onExportCsv?: () => void;
  title?: string;
  subtitle?: string;
  renderCustomCard?: (row: T, onTransition?: (targetStageKey: string) => void) => React.ReactNode;
}

const STAGE_PALETTES = [
  { color: '#F1EFEA', textColor: '#574F47', borderColor: '#DCD4C8' }, // warm gray
  { color: '#FEF3C7', textColor: '#B45309', borderColor: '#FDE68A' }, // amber
  { color: '#FFEDD5', textColor: '#C2410C', borderColor: '#FDBA74' }, // orange
  { color: '#EDE9FE', textColor: '#6D28D9', borderColor: '#DDD6FE' }, // purple
  { color: '#DBEAFE', textColor: '#1D4ED8', borderColor: '#BFDBFE' }, // blue
  { color: '#D1FAE5', textColor: '#047857', borderColor: '#A7F3D0' }, // emerald
  { color: '#FEE2E2', textColor: '#B91C1C', borderColor: '#FECACA' }, // red
  { color: '#E0E7FF', textColor: '#4338CA', borderColor: '#C7D2FE' }, // indigo
  { color: '#FCE7F3', textColor: '#BE185D', borderColor: '#FBCFE8' }, // pink
  { color: '#CCFBF1', textColor: '#0F766E', borderColor: '#99F6E4' }, // teal
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
    textColor: raw.textColor || palette.textColor,
    borderColor: raw.borderColor || palette.borderColor,
    statuses: Array.isArray(raw.statuses) && raw.statuses.length > 0 ? raw.statuses : [key],
  };
}

function deriveStagesFromContent<T>(content: T[] = [], stageKey?: string): KanbanStageDef[] {
  if (!content || content.length === 0) return [];
  const stageMap = new Map<string, { label: string; count: number }>();
  const orderedKeys: string[] = [];

  content.forEach((item) => {
    const rawStage = getRowStage(item, stageKey);
    if (rawStage && !stageMap.has(rawStage)) {
      const label = (item as any).stageName || (item as any).stageLabel || formatStageLabel(rawStage);
      stageMap.set(rawStage, { label, count: 1 });
      orderedKeys.push(rawStage);
    }

    // Also include forward stages from allowed transitions if present on items
    const allowed = (item as any).allowedNextTransitions;
    if (Array.isArray(allowed)) {
      allowed.forEach((opt: any) => {
        const code = String(opt.code || opt.id || '').toUpperCase();
        if (code && !stageMap.has(code)) {
          const label = opt.name || opt.label || formatStageLabel(code);
          stageMap.set(code, { label, count: 0 });
          orderedKeys.push(code);
        }
      });
    }
  });

  return orderedKeys.map((key, idx) => {
    const entry = stageMap.get(key)!;
    const palette = STAGE_PALETTES[idx % STAGE_PALETTES.length];
    return {
      key,
      label: entry.label,
      color: palette.color,
      textColor: palette.textColor,
      borderColor: palette.borderColor,
      statuses: [key],
    };
  });
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
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: column.currency ?? 'INR', maximumFractionDigits: 0 }).format(numeric)
      : String(value ?? '');
  }
  if (column.type === 'date' && value) {
    const date = new Date(value as string);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }
  if (column.type === 'badge') {
    const str = String(value ?? '');
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 9999,
          fontSize: '0.72rem',
          fontWeight: 700,
          backgroundColor: '#F3F4F6',
          color: '#374151',
        }}
      >
        {str}
      </span>
    );
  }
  return value === null || value === undefined ? '' : String(value);
}

function getRowStage<T>(row: T, stageKey?: string): string {
  const r = row as Record<string, unknown>;
  const val = (stageKey && r[stageKey]) || r.deliveryStatus || r.stageCode || r.stageName || r.status || '';
  return String(val).toUpperCase();
}

export function DynamicTable<T = any>({
  data,
  loading,
  userRoles = [],
  viewMode: controlledViewMode,
  onViewModeChange,
  availableViews = ['table', 'kanban', 'cards'],
  kanbanStages: explicitKanbanStages,
  stageKey,
  canDragRecord = true,
  onTransitionStage,
  onPageChange,
  onSortChange,
  onFilterChange,
  onSearchChange,
  searchValue = '',
  onRowClick,
  onExportCsv,
  title,
  subtitle,
  renderCustomCard,
}: DynamicTableProps<T>) {
  const [internalViewMode, setInternalViewMode] = useState<TableViewMode>('table');
  const activeView = controlledViewMode ?? internalViewMode;

  // Dynamically resolve Kanban stages:
  // 1. Explicit props passed
  // 2. data.stages (top-level)
  // 3. data.summary?.stages
  // 4. Dynamically derived from actual data content & transitions
  const kanbanStages: KanbanStageDef[] = React.useMemo(() => {
    if (explicitKanbanStages && explicitKanbanStages.length > 0) {
      return explicitKanbanStages.map((s, i) => normalizeStageDef(s, i));
    }
    const dataAny = data as any;
    if (Array.isArray(dataAny.stages) && dataAny.stages.length > 0) {
      return dataAny.stages.map((s: any, i: number) => normalizeStageDef(s, i));
    }
    if (data.summary && Array.isArray((data.summary as any).stages) && (data.summary as any).stages.length > 0) {
      return (data.summary as any).stages.map((s: any, i: number) => normalizeStageDef(s, i));
    }
    return deriveStagesFromContent(data.content, stageKey);
  }, [explicitKanbanStages, data, stageKey]);

  const setViewMode = (mode: TableViewMode) => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  // Drag-and-drop state for Kanban
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const columns = visibleColumns(data.columns ?? [], userRoles);
  const filters = (data.filters ?? []).filter(
    (f) => !f.rolesAllowed || f.rolesAllowed.length === 0 || f.rolesAllowed.some((r) => userRoles.includes(r))
  );

  const isSuperAdminOrAdmin = userRoles.some((r) =>
    ['SUPER_ADMIN', 'ADMIN', 'STORE_ADMIN'].includes(r.toUpperCase())
  );

  const isDraggable = (row: T) => {
    if (typeof canDragRecord === 'function') return canDragRecord(row);
    if (canDragRecord === false) return false;
    return isSuperAdminOrAdmin || userRoles.includes('SELLER');
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

  return (
    <div className="sdui-dynamic-table-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Top Header Bar with View Switcher & Title ── */}
      <div
        className="sdui-table-header-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          {title && <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{title}</h2>}
          {subtitle && <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#6B7280' }}>{subtitle}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View mode switcher */}
          {availableViews.length > 1 && (
            <div
              className="sdui-view-mode-toggle"
              style={{
                display: 'flex',
                background: '#F3F4F6',
                padding: 3,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
              }}
            >
              {availableViews.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: activeView === mode ? 700 : 500,
                    backgroundColor: activeView === mode ? '#FFFFFF' : 'transparent',
                    color: activeView === mode ? '#111827' : '#6B7280',
                    boxShadow: activeView === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}

          {data.enableExport && onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar: Search & Dynamic Filters ── */}
      <div
        className="sdui-table-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '8px 12px',
          background: '#F9FAFB',
          borderRadius: 8,
          border: '1px solid #E5E7EB',
        }}
      >
        {/* Search input */}
        {onSearchChange && (
          <input
            type="text"
            placeholder="Search records…"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #D1D5DB',
              fontSize: '0.82rem',
              minWidth: 200,
              outline: 'none',
            }}
          />
        )}

        {/* Dynamic Filters */}
        {filters.map((filter) => {
          const fType = String(filter.type || '').toUpperCase();
          if (fType === 'SELECT' || fType === 'MULTI_SELECT') {
            return (
              <select
                key={filter.key}
                onChange={(e) => onFilterChange?.({ [filter.key]: e.target.value })}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  fontSize: '0.82rem',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">{filter.placeholder ?? filter.label}</option>
                {(filter.options ?? []).map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          }
          return null;
        })}
      </div>

      {/* ── Body: TABLE VIEW ── */}
      {activeView === 'table' && (
        <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, background: '#FFFFFF' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      padding: '10px 14px',
                      fontWeight: 700,
                      color: '#374151',
                      textAlign: column.align ?? 'left',
                      cursor: column.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                    onClick={() => column.sortable && onSortChange?.(column.key, data.sortDir === 'asc' ? 'desc' : 'asc')}
                  >
                    {column.label}
                    {column.sortable && data.sortBy === column.key && (
                      <span style={{ marginLeft: 4 }}>{data.sortDir === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </th>
                ))}
                {onTransitionStage && (
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', width: 140 }}>
                    Transition
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (onTransitionStage ? 1 : 0)} style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>
                    Loading records…
                  </td>
                </tr>
              ) : data.content.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (onTransitionStage ? 1 : 0)} style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>
                    No records found
                  </td>
                </tr>
              ) : (
                data.content.map((row, idx) => {
                  const currentStage = getRowStage(row, stageKey);
                  const allowedNext: StageTransitionOption[] = (row as any).allowedNextTransitions || [];

                  return (
                    <tr
                      key={(row as any).id ?? idx}
                      onClick={() => onRowClick?.(row)}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        cursor: onRowClick ? 'pointer' : 'default',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {columns.map((column) => (
                        <td key={column.key} style={{ padding: '10px 14px', textAlign: column.align ?? 'left' }}>
                          {renderCell(row, column)}
                        </td>
                      ))}

                      {/* Inline Stage Transition in Table View */}
                      {onTransitionStage && (
                        <td style={{ padding: '8px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {allowedNext.length > 0 ? (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const target = e.target.value;
                                if (!target) return;
                                const option = allowedNext.find((o) => o.id === target || o.code === target);
                                void onTransitionStage(row, target, option);
                                e.target.value = '';
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #D1D5DB',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">Move stage…</option>
                              {allowedNext.map((opt) => (
                                <option key={opt.id || opt.code} value={opt.id || opt.code}>
                                  → {opt.name || opt.code}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Body: KANBAN VIEW with Drag & Drop ── */}
      {activeView === 'kanban' && (
        kanbanStages.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: '#6B7280',
              backgroundColor: '#F9FAFB',
              borderRadius: 10,
              border: '1px dashed #D1D5DB',
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#374151', marginBottom: 4 }}>
              No Kanban Stages Configured
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              Stages are populated dynamically from the active workflow engine or entity records.
            </div>
          </div>
        ) : (
          <div
            className="sdui-kanban-board"
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 12,
              minHeight: 480,
            }}
          >
            {kanbanStages.map((stage) => {
              const isColOver = dragOverCol === stage.key;
            const stageRecords = data.content.filter((item) => {
              const itemStage = getRowStage(item, stageKey);
              if (stage.statuses && stage.statuses.length > 0) {
                return stage.statuses.includes(itemStage) || itemStage === stage.key;
              }
              return itemStage === stage.key;
            });

            return (
              <div
                key={stage.key}
                className={`sdui-kanban-column ${isColOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, stage.key)}
                style={{
                  flex: '0 0 280px',
                  background: isColOver ? '#FEF3C7' : '#F9FAFB',
                  border: `1px solid ${isColOver ? '#F59E0B' : '#E5E7EB'}`,
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '75vh',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: stage.textColor ?? '#6B7280',
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>{stage.label}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 9999,
                      background: stage.color ?? '#E5E7EB',
                      color: stage.textColor ?? '#374151',
                    }}
                  >
                    {stageRecords.length}
                  </span>
                </div>

                {/* Card list */}
                <div
                  style={{
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    overflowY: 'auto',
                    flex: 1,
                  }}
                >
                  {stageRecords.map((item, i) => {
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
                        onClick={() => onRowClick?.(item)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: 8,
                          padding: 10,
                          cursor: draggable ? 'grab' : 'pointer',
                          opacity: isDragged ? 0.4 : 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1D4ED8' }}>
                            {(item as any).code || `#${(item as any).id || i + 1}`}
                          </span>
                          {(item as any).totalAmount !== undefined && (
                            <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                              ₹{Math.round(Number((item as any).totalAmount))}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', marginTop: 4 }}>
                          {(item as any).itemsSummary || (item as any).name || (item as any).title || 'Item record'}
                        </div>

                        {(item as any).customerName && (
                          <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>
                            👤 {(item as any).customerName}
                          </div>
                        )}

                        {/* Inline Stage transition buttons on Kanban card */}
                        {allowedNext.length > 0 && onTransitionStage && (
                          <div
                            style={{
                              marginTop: 8,
                              paddingTop: 6,
                              borderTop: '1px dashed #E5E7EB',
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
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  border: '1px solid #93C5FD',
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  cursor: 'pointer',
                                }}
                              >
                                → {opt.name || opt.code}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* ── Body: CARDS / GRID VIEW ── */}
      {activeView === 'cards' && (
        <div
          className="sdui-cards-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: 32, textAlign: 'center', color: '#6B7280' }}>
              Loading cards…
            </div>
          ) : data.content.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 32, textAlign: 'center', color: '#6B7280' }}>
              No records found
            </div>
          ) : (
            data.content.map((item, idx) => {
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
                  onClick={() => onRowClick?.(item)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 10,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    cursor: onRowClick ? 'pointer' : 'default',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1D4ED8' }}>
                      {(item as any).code || `#${(item as any).id || idx + 1}`}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                      }}
                    >
                      {currentStage.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>
                    {(item as any).itemsSummary || (item as any).name || (item as any).title || 'Record Items'}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {(item as any).customerName && <div>Customer: {(item as any).customerName}</div>}
                    {(item as any).storeName && <div>Store: {(item as any).storeName}</div>}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                      paddingTop: 8,
                      borderTop: '1px solid #F3F4F6',
                    }}
                  >
                    {(item as any).totalAmount !== undefined && (
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        ₹{Math.round(Number((item as any).totalAmount))}
                      </span>
                    )}

                    {/* Stage transition button on card */}
                    {allowedNext.length > 0 && onTransitionStage && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onTransitionStage(item, allowedNext[0].code || allowedNext[0].id, allowedNext[0])}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 6,
                            border: '1px solid #93C5FD',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            cursor: 'pointer',
                          }}
                        >
                          → {allowedNext[0].name || allowedNext[0].code}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Footer: Pagination ── */}
      <div
        className="sdui-table-footer"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginTop: 4,
          padding: '6px 4px',
        }}
      >
        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
          Total {data.totalElements ?? data.content.length} records
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            disabled={data.pageNumber <= 0}
            onClick={() => onPageChange?.(data.pageNumber - 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              fontSize: '0.78rem',
              cursor: data.pageNumber <= 0 ? 'not-allowed' : 'pointer',
              opacity: data.pageNumber <= 0 ? 0.5 : 1,
            }}
          >
            Prev
          </button>
          <span style={{ fontSize: '0.78rem', color: '#374151' }}>
            Page {data.pageNumber + 1} of {Math.max(1, data.totalPages)}
          </span>
          <button
            type="button"
            disabled={data.last}
            onClick={() => onPageChange?.(data.pageNumber + 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              fontSize: '0.78rem',
              cursor: data.last ? 'not-allowed' : 'pointer',
              opacity: data.last ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
