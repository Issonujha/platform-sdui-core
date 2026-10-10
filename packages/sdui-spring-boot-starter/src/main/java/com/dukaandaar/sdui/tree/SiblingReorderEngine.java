package com.dukaandaar.sdui.tree;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Computes the minimal set of deltas when an item is dragged to a new index within
 * one parent's children. Every delta carries that item's own resulting parent id;
 * only the dragged target receives {@code newParentId}.
 */
public final class SiblingReorderEngine {

    private SiblingReorderEngine() {
    }

    public static <T extends TreeNode<T>> List<ReorderDelta> calculate(
            List<T> siblings, String targetId, int newIndex, String newParentId) {

        List<T> list = new ArrayList<>(siblings);
        int oldIndex = -1;
        for (int i = 0; i < list.size(); i++) {
            if (Objects.equals(list.get(i).getId(), targetId)) {
                oldIndex = i;
                break;
            }
        }
        if (oldIndex < 0) {
            return List.of();
        }

        T target = list.remove(oldIndex);
        int clamped = Math.max(0, Math.min(newIndex, list.size()));
        list.add(clamped, target);

        List<ReorderDelta> deltas = new ArrayList<>();
        for (int i = 0; i < list.size(); i++) {
            T item = list.get(i);
            boolean isTarget = Objects.equals(item.getId(), targetId);
            String parentId = isTarget ? newParentId : item.getParentId();
            boolean parentChanged = isTarget && !Objects.equals(newParentId, target.getParentId());
            boolean orderChanged = item.getOrderIndex() != i;
            if (orderChanged || parentChanged) {
                deltas.add(new ReorderDelta(item.getId(), i, parentId));
            }
        }
        return deltas;
    }
}
