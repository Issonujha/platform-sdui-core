package com.dukaandaar.sdui.contract;

/**
 * One option of a {@link FilterDefinition}. {@code count} is optional (facet totals).
 */
public record FilterOption(String label, Object value, Long count) {

    public FilterOption(String label, Object value) {
        this(label, value, null);
    }
}
