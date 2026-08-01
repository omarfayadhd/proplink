import type { UploadedImage } from "@/components/uploads/types";

/**
 * Pure drag-reorder helper: moves the item at `fromIndex` to `toIndex` and
 * renumbers `sortOrder` sequentially (0..n-1) so the result can be persisted
 * as-is. Out-of-range indices are a no-op (still renumbered defensively).
 */
export function reorderImages<T extends UploadedImage>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  const inRange = (i: number) => i >= 0 && i < items.length;
  if (!inRange(fromIndex) || !inRange(toIndex)) {
    return items.map((item, i) => ({ ...item, sortOrder: i }));
  }

  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next.map((item, i) => ({ ...item, sortOrder: i }));
}
