package com.dukaandaar.sdui.tree;

/**
 * One reorder delta to persist. {@code nextParentId} is this item's own resulting parent;
 * only the dragged item receives a changed parent id.
 */
public record ReorderDelta(String id, int nextOrderIndex, String nextParentId) {
}
