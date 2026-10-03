import { Comment, Fragment, Text, isVNode, type Slot, type VNodeArrayChildren } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';

type Child = VNodeArrayChildren[number] | undefined;

const isBlank = (value: unknown): boolean => typeof value === 'string' && value.trim() === '';

const isIgnorable = (child: Child): boolean =>
  child === null ||
  child === undefined ||
  typeof child === 'boolean' ||
  isBlank(child) ||
  (isVNode(child) && (child.type === Comment || (child.type === Text && isBlank(child.children))));

const childrenOf = (child: Child): VNodeArrayChildren | undefined => {
  if (Array.isArray(child)) {
    return child;
  }
  if (isVNode(child) && child.type === Fragment && Array.isArray(child.children)) {
    return child.children;
  }
  return undefined;
};

const isIcon = (child: Child): boolean => isVNode(child) && child.type === NuiIcon;

export const slotContent = (slot: Slot | undefined): 'empty' | 'icons' | 'other' => {
  if (!slot) {
    return 'empty';
  }
  const queue: VNodeArrayChildren = [...slot()];
  let icons = 0;

  while (queue.length > 0) {
    const child = queue.pop();
    const nested = childrenOf(child);

    if (nested) {
      queue.push(...nested);
    } else if (isIcon(child)) {
      icons += 1;
    } else if (!isIgnorable(child)) {
      return 'other';
    }
  }
  return icons > 0 ? 'icons' : 'empty';
};
