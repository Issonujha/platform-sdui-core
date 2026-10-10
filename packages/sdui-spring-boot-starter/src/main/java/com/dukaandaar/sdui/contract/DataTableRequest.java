package com.dukaandaar.sdui.contract;

import java.util.Map;

/**
 * Standard request holder for server-side dynamic tables. Mirrors the current
 * rn-backend {@code DataTableRequest} shape.
 */
public record DataTableRequest(
        int page,
        int size,
        String sortBy,
        String sortDir,
        String search,
        Map<String, Object> filters
) {
    public DataTableRequest {
        page = Math.max(0, page);
        size = (size > 0 && size <= 100) ? size : 10;
        sortDir = "ASC".equalsIgnoreCase(sortDir) ? "ASC" : "DESC";
        filters = filters != null ? Map.copyOf(filters) : Map.of();
    }

    public Object filter(String key) {
        return filters.get(key);
    }

    public String filterString(String key) {
        Object value = filters.get(key);
        return value == null ? null : value.toString().trim();
    }
}
