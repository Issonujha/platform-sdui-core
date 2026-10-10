import type { NavigationItem } from './contracts.js';

/**
 * Builds a nested navigation tree from a flat list. Mirrors the backend
 * TreeHierarchyEngine: duplicate ids throw, orphans are promoted to roots,
 * true cycles throw.
 */
export function buildNavTree(flatItems: NavigationItem[]): NavigationItem[] {
  if (!flatItems || flatItems.length === 0) return [];

  const byId = new Map<string, NavigationItem>();
  for (const item of flatItems) {
    if (byId.has(item.id)) throw new Error(`Duplicate node id: ${item.id}`);
    byId.set(item.id, { ...item, children: [] });
  }

  const roots: NavigationItem[] = [];
  const childrenByParent = new Map<string, NavigationItem[]>();

  for (const item of flatItems) {
    const node = byId.get(item.id)!;
    const parentId = item.parentId ?? null;
    if (parentId === null || !byId.has(parentId)) {
      roots.push(node);
    } else {
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(node);
      childrenByParent.set(parentId, siblings);
    }
  }

  const sortAndLink = (nodes: NavigationItem[]): void => {
    nodes.sort((a, b) => a.order - b.order);
    for (const node of nodes) {
      const children = childrenByParent.get(node.id) ?? [];
      node.children = children;
      sortAndLink(children);
    }
  };
  sortAndLink(roots);

  const reachable = new Set<string>();
  const visit = (nodes: NavigationItem[]): void => {
    for (const node of nodes) {
      if (reachable.has(node.id)) continue;
      reachable.add(node.id);
      visit(node.children ?? []);
    }
  };
  visit(roots);

  if (reachable.size < byId.size) {
    for (const id of byId.keys()) {
      if (reachable.has(id)) continue;
      const path = new Set<string>();
      let cursor: string | null = id;
      while (cursor !== null && !path.has(cursor)) {
        path.add(cursor);
        cursor = byId.get(cursor)?.parentId ?? null;
      }
      if (cursor !== null) {
        throw new Error(`Circular hierarchy cycle detected involving node: ${id}`);
      }
    }
  }

  return roots;
}
