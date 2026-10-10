package com.dukaandaar.sdui.contract;

import java.util.List;
import java.util.Map;

/**
 * Metadata definition for a table column. {@code type} is a string (e.g. "text",
 * "money", "badge") to stay forward-compatible with new renderers.
 */
public record ColumnDefinition(
        String key,
        String label,
        String type,
        boolean sortable,
        boolean filterable,
        String align,
        String width,
        String currency,
        Map<String, String> badgeColorMap,
        List<TableAction> actions
) {
    public ColumnDefinition {
        align = align != null ? align : "left";
        currency = currency != null ? currency : "INR";
        badgeColorMap = badgeColorMap != null ? Map.copyOf(badgeColorMap) : Map.of();
        actions = actions != null ? List.copyOf(actions) : List.of();
    }

    /** Convenience for the common "sortable, not filterable" case. */
    public static ColumnDefinition of(String key, String label, String type) {
        return new ColumnDefinition(key, label, type, true, false, "left", null, null, Map.of(), List.of());
    }
}
