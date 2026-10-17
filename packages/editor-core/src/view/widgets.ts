import type { DecorationSet, WidgetDecoration } from '../decorations/decorations.types';
import type { EditorState } from '../state/state.types';
import { outerOf, type ElementDesc, type ViewContext } from './desc';

interface WidgetSlot {
  readonly desc: ElementDesc;
  readonly index: number;
}

interface PlacedWidget {
  readonly dom: HTMLElement;
  readonly slot: WidgetSlot;
}

const slotOf = (
  context: ViewContext,
  state: EditorState,
  widget: WidgetDecoration,
): WidgetSlot | undefined => {
  if (widget.pos < 0 || widget.pos > state.doc.size) {
    return undefined;
  }
  const $pos = state.doc.resolve(widget.pos);
  const desc = context.byId.get($pos.parent.id);

  return desc === undefined ||
    desc.contentDOM === null ||
    context.schema.nodes.get($pos.parent.type)?.inlineContent === true
    ? undefined
    : { desc, index: $pos.index };
};

const sameSlot = (left: WidgetSlot, right: WidgetSlot): boolean =>
  left.desc === right.desc && left.index === right.index;

const placeGroup = (group: readonly PlacedWidget[]): void => {
  const first = group[0];

  if (first === undefined) {
    return;
  }
  const { desc, index } = first.slot;
  const child = desc.children[index];

  if (child !== undefined) {
    let next: ChildNode = outerOf(child);

    for (const { dom } of group.toReversed()) {
      if (dom.nextSibling !== next) {
        next.before(dom);
      }
      next = dom;
    }
    return;
  }
  const last = desc.children.at(-1);
  let previous: ChildNode | undefined = last === undefined ? undefined : outerOf(last);

  for (const { dom } of group) {
    if (previous === undefined) {
      desc.contentDOM?.append(dom);
    } else if (previous.nextSibling !== dom) {
      previous.after(dom);
    }
    previous = dom;
  }
};

const groupsOf = (placed: readonly PlacedWidget[]): PlacedWidget[][] => {
  const groups: PlacedWidget[][] = [];

  for (const widget of placed) {
    const group = groups.find((candidate) =>
      candidate[0] === undefined ? false : sameSlot(candidate[0].slot, widget.slot),
    );

    if (group === undefined) {
      groups.push([widget]);
    } else {
      group.push(widget);
    }
  }
  return groups;
};

const prepare = (context: ViewContext, dom: HTMLElement): HTMLElement => {
  if (!context.widgets.has(dom)) {
    dom.setAttribute('contenteditable', 'false');
    context.widgets.add(dom);
  }
  return dom;
};

export const placeWidgets = (
  context: ViewContext,
  state: EditorState,
  sets: readonly DecorationSet[],
): void => {
  const placed: PlacedWidget[] = [];
  const keys = new Set<string>();

  for (const widget of sets.flatMap((set) => set.widgets)) {
    const slot = keys.has(widget.key) ? undefined : slotOf(context, state, widget);
    const dom = slot === undefined ? undefined : context.widget(widget.key);

    if (slot !== undefined && dom !== undefined) {
      keys.add(widget.key);
      context.placed.set(widget.key, dom);
      placed.push({ dom: prepare(context, dom), slot });
    }
  }
  for (const [key, dom] of context.placed) {
    if (!keys.has(key)) {
      dom.remove();
      context.placed.delete(key);
    }
  }
  for (const group of groupsOf(placed)) {
    placeGroup(group);
  }
};
