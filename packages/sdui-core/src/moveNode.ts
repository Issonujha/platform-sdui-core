import type { NavigationItem } from './contracts.js';

export interface NodeDelta {
  id: string;
  parentId: string | null;
  order: number;
}

/**
 * Pure, framework-free reorder: moves `draggedId` relative to `targetId` and returns
 * both the new tree and the deltas the host should persist. Contains no network I/O.
 */
export function moveNode(
  roots: NavigationItem[],
  draggedId: string,
  targetId: string,
  placement: 'before' | 'after' | 'inside'
): { tree: NavigationItem[]; deltas: NodeDelta[] } {
  const deltas: NodeDelta[] = [];

  const clone = (nodes: NavigationItem[]): NavigationItem[] =>
    nodes.map((n) => ({ ...n, children: n.children ? clone(n.children) : undefined }));

  const detach = (nodes: NavigationItem[], id: string): NavigationItem | null => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes.splice(i, 1)[0];
      const found = nodes[i].children ? detach(nodes[i].children!, id) : null;
      if (found) return found;
    }
    return null;
  };

  const next = clone(roots);
  const dragged = detach(next, draggedId);
  if (!dragged || draggedId === targetId) return { tree: roots, deltas: [] };

  const insertInto = (nodes: NavigationItem[]): boolean => {
    for (const node of nodes) {
      if (node.id === targetId) {
        node.children = node.children ?? [];
        if (placement === 'inside') {
          node.children.push(dragged);
        } else {
          const idx = placement === 'before' ? 0 : node.children.length;
          node.children.splice(idx, 0, dragged);
        }
        return true;
      }
      if (node.children && insertInto(node.children)) return true;
    }
    return false;
  };

  if (!insertInto(next)) return { tree: roots, deltas: [] };

  const walk = (nodes: NavigationItem[], parentId: string | null) => {
    nodes.forEach((n, i) => {
      deltas.push({ id: n.id, parentId, order: i });
      if (n.children?.length) walk(n.children, n.id);
    });
  };
  walk(next, null);

  return { tree: next, deltas };
}
