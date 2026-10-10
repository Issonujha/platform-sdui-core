import { useState, useCallback } from 'react';
import type { NavigationItem } from './contracts.js';
import { moveNode, type NodeDelta } from './moveNode.js';

export type DropPlacement = 'before' | 'after' | 'inside';

/**
 * Headless drag-and-drop state for a navigation tree. Performs no network I/O: the
 * host receives deltas via the callback passed to `onDrop`.
 */
export function useTreeDragDrop(initialItems: NavigationItem[]) {
  const [items, setItems] = useState<NavigationItem[]>(initialItems);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; placement: 'before' | 'after' | 'inside' } | null>(
    null
  );

  const onDragStart = useCallback((id: string) => setDraggedId(id), []);

  const onDragOver = useCallback(
    (targetId: string, ratio: number, isGroup: boolean) => {
      if (isGroup && ratio >= 0.3 && ratio <= 0.7) setDropTarget({ id: targetId, placement: 'inside' });
      else if (ratio < 0.5) setDropTarget({ id: targetId, placement: 'before' });
      else setDropTarget({ id: targetId, placement: 'after' });
    },
    []
  );

  const onDrop = useCallback(
    (onCommitDeltas: (deltas: NodeDelta[]) => void) => {
      if (!draggedId || !dropTarget) return;
      const { tree, deltas } = moveNode(items, draggedId, dropTarget.id, dropTarget.placement);
      setItems(tree);
      setDraggedId(null);
      setDropTarget(null);
      onCommitDeltas(deltas); // host persists deltas; package performs no network I/O
    },
    [items, draggedId, dropTarget]
  );

  return { items, draggedId, dropTarget, onDragStart, onDragOver, onDrop, setItems };
}
