package com.dukaandaar.sdui.contract;

import java.util.List;
import java.util.Map;

/**
 * Universal metadata-driven table contract.
 * Pure data carrier: zero third-party framework dependencies.
 *
 * <p>Wire format matches rn-backend today: the {@code last} flag (not {@code isLast}),
 * plus the live-reload / export / column-visibility feature flags.
 */
public record DataTableResponse<T>(
        List<T> content,
        long totalElements,
        int totalPages,
        int pageNumber,
        int pageSize,
        boolean last,
        List<ColumnDefinition> columns,
        List<FilterDefinition> filters,
        String sortBy,
        String sortDir,
        Map<String, Object> summary,
        Boolean enableLiveReload,
        Integer defaultLiveReload,
        Boolean enableExport,
        Boolean enableColumnVisibility
) {
    public DataTableResponse {
        content = List.copyOf(content != null ? content : List.of());
        columns = List.copyOf(columns != null ? columns : List.of());
        filters = List.copyOf(filters != null ? filters : List.of());
        summary = summary != null ? Map.copyOf(summary) : Map.of();
        enableLiveReload = enableLiveReload != null ? enableLiveReload : Boolean.TRUE;
        defaultLiveReload = defaultLiveReload != null ? defaultLiveReload : 0;
        enableExport = enableExport != null ? enableExport : Boolean.TRUE;
        enableColumnVisibility = enableColumnVisibility != null ? enableColumnVisibility : Boolean.TRUE;
    }
}
