import { useCallback, useState } from "react";
import type { DragEvent } from "react";

type RowDragHandlers = {
  onDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
};

/**
 * Native HTML5 drag-and-drop for table rows. Dropping a row onto another
 * moves it to that row's position and reports the full resulting id order.
 */
export function useRowDragSort<T extends { id: string }>(
  rows: readonly T[],
  onReorder: (orderedIds: string[]) => void,
) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const finish = useCallback(() => {
    setDragId(null);
    setOverId(null);
  }, []);

  const rowProps = useCallback(
    (row: T): RowDragHandlers => ({
      onDragStart: (event) => {
        setDragId(row.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", row.id);
      },
      onDragOver: (event) => {
        if (dragId === null || dragId === row.id) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (overId !== row.id) setOverId(row.id);
      },
      onDrop: (event) => {
        event.preventDefault();
        if (dragId !== null && dragId !== row.id) {
          const from = rows.findIndex((item) => item.id === dragId);
          const to = rows.findIndex((item) => item.id === row.id);
          if (from !== -1 && to !== -1) {
            const next = [...rows];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            onReorder(next.map((item) => item.id));
          }
        }
        finish();
      },
      onDragEnd: () => {
        finish();
      },
      isDragging: dragId === row.id,
      isDropTarget: overId === row.id,
    }),
    [rows, dragId, overId, onReorder, finish],
  );

  return { rowProps };
}
