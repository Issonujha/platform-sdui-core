package com.dukaandaar.sdui.contract;

import java.util.List;

/**
 * A single filter dimension. {@code type} is a string superset of rn-backend's
 * {@code FilterType}: SELECT, MULTI_SELECT, FACET, LOOKUP, DATE_RANGE, SEARCH, BOOLEAN.
 */
public record FilterDefinition(
        String key,
        String label,
        String type,
        String placeholder,
        Object defaultValue,
        List<FilterOption> options,
        String entityKey,
        int minChars,
        boolean multiple,
        String facetKey,
        String columnKey,
        java.util.List<String> rolesAllowed,
        String dependsOn,
        String optionsEndpoint
) {
    public FilterDefinition {
        options = options != null ? java.util.List.copyOf(options) : java.util.List.of();
        rolesAllowed = rolesAllowed != null ? java.util.List.copyOf(rolesAllowed) : java.util.List.of();
        if ("LOOKUP".equals(type)) {
            minChars = Math.max(1, minChars);
        }
    }
}
