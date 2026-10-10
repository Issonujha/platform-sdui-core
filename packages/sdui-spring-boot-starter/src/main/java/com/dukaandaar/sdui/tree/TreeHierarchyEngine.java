package com.dukaandaar.sdui.tree;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * O(N) hierarchy assembly (O(N log N) worst case once sibling ordering comparisons
 * are counted).
 *
 * <ul>
 *   <li>duplicate ids → {@link IllegalStateException};</li>
 *   <li>nodes whose {@code parentId} is missing are <b>promoted to roots</b> (orphan adoption);</li>
 *   <li>true cycles (a node reachable only through its own ancestors) → {@link IllegalStateException}.</li>
 * </ul>
 *
 * The engine mutates the provided nodes in place.
 */
public final class TreeHierarchyEngine {

    private TreeHierarchyEngine() {
    }

    public static <T extends TreeNode<T>> List<T> buildHierarchy(Collection<T> flatItems) {
        if (flatItems == null || flatItems.isEmpty()) {
            return List.of();
        }

        Map<String, T> byId = new LinkedHashMap<>();
        for (T item : flatItems) {
            if (byId.put(item.getId(), item) != null) {
                throw new IllegalStateException("Duplicate node id: " + item.getId());
            }
        }

        Map<String, List<T>> childrenByParent = new LinkedHashMap<>();
        List<T> roots = new ArrayList<>();
        for (T item : flatItems) {
            String parentId = item.getParentId();
            if (parentId == null || !byId.containsKey(parentId)) {
                roots.add(item); // root or adopted orphan
            } else {
                childrenByParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(item);
            }
        }
        roots.sort(Comparator.comparingInt(TreeNode::getOrderIndex));

        Deque<T> queue = new ArrayDeque<>(roots);
        Set<String> visited = new HashSet<>();
        while (!queue.isEmpty()) {
            T current = queue.poll();
            if (!visited.add(current.getId())) {
                continue;
            }
            List<T> children = new ArrayList<>(childrenByParent.getOrDefault(current.getId(), List.of()));
            children.sort(Comparator.comparingInt(TreeNode::getOrderIndex));
            current.setChildren(children);
            queue.addAll(children);
        }

        // Anything unreachable from a root can only be part of a cycle (orphans were adopted).
        if (visited.size() < byId.size()) {
            for (String id : byId.keySet()) {
                if (visited.contains(id)) {
                    continue;
                }
                Set<String> path = new HashSet<>();
                String cursor = id;
                while (cursor != null && path.add(cursor)) {
                    T node = byId.get(cursor);
                    cursor = node == null ? null : node.getParentId();
                }
                if (cursor != null) {
                    throw new IllegalStateException("Circular hierarchy cycle detected involving node: " + id);
                }
            }
        }

        return List.copyOf(roots);
    }
}
