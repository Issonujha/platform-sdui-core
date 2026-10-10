package com.dukaandaar.sdui.tree;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;

class TreeEngineTest {

    static class Node implements TreeNode<Node> {
        private final String id;
        private final String parentId;
        private final int order;
        private List<Node> children;

        Node(String id, String parentId, int order) {
            this.id = id;
            this.parentId = parentId;
            this.order = order;
        }

        @Override
        public String getId() {
            return id;
        }

        @Override
        public String getParentId() {
            return parentId;
        }

        @Override
        public int getOrderIndex() {
            return order;
        }

        @Override
        public List<Node> getChildren() {
            return children;
        }

        @Override
        public void setChildren(List<Node> children) {
            this.children = children;
        }
    }

    @Test
    void buildsHierarchyAndPromotesOrphans() {
        Node root = new Node("1", null, 0);
        Node child = new Node("2", "1", 0);
        Node orphan = new Node("3", "missing", 0);

        List<Node> roots = TreeHierarchyEngine.buildHierarchy(List.of(root, child, orphan));

        assertEquals(2, roots.size());
        assertEquals(1, root.getChildren().size());
        assertEquals("2", root.getChildren().get(0).getId());
    }

    @Test
    void duplicateIdThrows() {
        Node a = new Node("dup", null, 0);
        Node b = new Node("dup", null, 1);
        assertThrows(IllegalStateException.class, () -> TreeHierarchyEngine.buildHierarchy(List.of(a, b)));
    }

    @Test
    void cycleThrows() {
        Node a = new Node("a", "b", 0);
        Node b = new Node("b", "a", 0);
        assertThrows(IllegalStateException.class, () -> TreeHierarchyEngine.buildHierarchy(List.of(a, b)));
    }

    @Test
    void reorderComputesDeltasAndOnlyDraggedGetsNewParent() {
        Node x = new Node("x", "p", 0);
        Node y = new Node("y", "p", 1);
        Node z = new Node("z", "p", 2);

        List<ReorderDelta> deltas = SiblingReorderEngine.calculate(List.of(x, y, z), "z", 0, "p");

        assertEquals(3, deltas.size());
        ReorderDelta first = deltas.get(0);
        assertEquals("z", first.id());
        assertEquals(0, first.nextOrderIndex());
        assertEquals("p", first.nextParentId());
    }
}
