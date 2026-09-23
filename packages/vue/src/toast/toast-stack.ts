import type { Toast } from '@numior/primitives';

export interface StackItem {
  readonly toast: Toast;
  readonly index: number;
  readonly offset: number;
}

export const layoutStack = (
  toasts: readonly Toast[],
  sizes: ReadonlyMap<string, number>,
): readonly StackItem[] => {
  const items: StackItem[] = [];
  let index = 0;
  let offset = 0;
  for (const toast of toasts.toReversed()) {
    items.push({ toast, index, offset });
    if (!toast.leaving) {
      index += 1;
      offset += sizes.get(toast.id) ?? 0;
    }
  }
  return items;
};

export const frontSize = (
  items: readonly StackItem[],
  sizes: ReadonlyMap<string, number>,
): number | undefined => {
  const front = items.find((item) => !item.toast.leaving);
  return front ? sizes.get(front.toast.id) : undefined;
};

export const itemStyle = (item: StackItem, size: number | undefined): Record<string, string> => ({
  '--_index': String(item.index),
  '--_offset': `${item.offset}px`,
  ...(size === undefined ? {} : { '--_size': `${size}px` }),
});
