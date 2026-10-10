package com.dukaandaar.sdui.contract;

/**
 * A row/column action. {@code endpoint} is a logical path owned by the host fetcher;
 * the package never executes it.
 */
public record TableAction(
        String key,
        String label,
        String icon,
        String method,
        String endpoint,
        String confirmText
) {
}
