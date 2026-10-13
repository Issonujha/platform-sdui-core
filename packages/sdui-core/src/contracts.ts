/**
 * Universal SDUI contracts. These are field-compatible supersets of rn-backend's
 * current JSON wire format. The canonical pagination flag is `last` (not `isLast`).
 */

export type ColumnType = 'text' | 'money' | 'badge' | 'number' | 'date' | 'link' | 'custom';

export interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  label: string;
  type?: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  currency?: string;
  badgeColorMap?: Record<string, string>;
  actions?: TableAction<T>[];
  /** Roles permitted to view this column. Empty/undefined = visible to all. */
  rolesAllowed?: string[];
}

export interface TableAction<T = Record<string, unknown>> {
  key: string;
  label: string;
  icon?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string | ((row: T) => string);
  confirmText?: string;
}

export type FilterType =
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'FACET'
  | 'LOOKUP'
  | 'DATE_RANGE'
  | 'SEARCH'
  | 'BOOLEAN';

export interface FilterOption {
  label: string;
  value: string | number | boolean | null;
  count?: number | null;
}

export interface FilterDef {
  key: string;
  label: string;
  type: FilterType;
  placeholder?: string;
  options?: FilterOption[];
  defaultValue?: unknown;
  /** LOOKUP: registry key resolved by the host lookup service. */
  entityKey?: string;
  minChars?: number;
  /** LOOKUP / MULTI_SELECT. */
  multiple?: boolean;
  /** FACET: facet key resolved when options are empty. */
  facetKey?: string;
  /** Column this filter binds to. */
  columnKey?: string;
  /** Roles permitted to see/interact with this dimension. */
  rolesAllowed?: string[];
  /** Cascading parent filter key. */
  dependsOn?: string;
  /** Remote endpoint for dynamic options (executed by the host fetcher). */
  optionsEndpoint?: string;
}

export interface DataTableResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  /** Wire field is `last` (matches rn-backend), never `isLast`. */
  last: boolean;
  columns: ColumnDef<T>[];
  filters: FilterDef[];
  sortBy?: string;
  sortDir?: 'asc' | 'desc' | 'ASC' | 'DESC';
  summary?: Record<string, unknown>;
  stages?: KanbanStageDef[];
  enableLiveReload?: boolean;
  defaultLiveReload?: number;
  enableExport?: boolean;
  enableColumnVisibility?: boolean;
}

export interface DataTableRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  search?: string;
  filters?: Record<string, unknown>;
}

export interface NavigationItem {
  id: string;
  code: string;
  label: string;
  route: string;
  icon?: string;
  order: number;
  parentId?: string | null;
  type?: 'LINK' | 'GROUP' | 'DIVIDER';
  visible?: boolean;
  requiredRoles?: string[];
  exactMatch?: boolean;
  group?: string;
  children?: NavigationItem[];
}

export interface PlatformFilter {
  key: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  defaultValue?: unknown;
  entityKey?: string;
  multiple?: boolean;
}

export type TableViewMode = 'table' | 'kanban' | 'cards' | 'list';

export interface KanbanStageDef {
  key: string;
  label: string;
  color?: string;
  textColor?: string;
  borderColor?: string;
  statuses?: string[];
}

export interface StageTransitionOption {
  id: string;
  name: string;
  code: string;
  requiresOtp?: boolean;
  primary?: boolean;
}

