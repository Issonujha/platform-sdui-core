package com.dukaandaar.sdui.tree;

import java.util.List;

/** Minimal contract a node must expose to the hierarchy and reorder engines. */
public interface TreeNode<T> {

    String getId();

    String getParentId();

    int getOrderIndex();

    List<T> getChildren();

    void setChildren(List<T> children);
}
