import {
  Comment,
  Fragment,
  Text,
  isVNode,
  type Slot,
  type VNode,
  type VNodeArrayChildren,
} from 'vue';

const isBlankText = (child: VNode): boolean =>
  child.type === Text && typeof child.children === 'string' && child.children.trim() === '';

const flattenChildren = (children: VNodeArrayChildren): VNode[] =>
  children.flatMap((child): VNode[] => {
    if (Array.isArray(child)) {
      return flattenChildren(child);
    }
    if (!isVNode(child)) {
      return [];
    }
    if (child.type === Fragment && Array.isArray(child.children)) {
      return flattenChildren(child.children);
    }
    return child.type === Comment || isBlankText(child) ? [] : [child];
  });

export interface SlicedChildren {
  readonly visible: VNode[];
  readonly hidden: number;
}

export const sliceChildren = (slot: Slot | undefined, max: number | undefined): SlicedChildren => {
  const all = slot ? flattenChildren(slot()) : [];
  const visible = max === undefined ? all : all.slice(0, Math.max(0, max));
  return { visible, hidden: all.length - visible.length };
};
