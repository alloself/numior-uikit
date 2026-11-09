import {
  insertMarked,
  markAttrs,
  markExtent,
  SelectionKind,
  selectionRange,
  setMark,
  textPosition,
  type Command,
  type Doc,
  type EditorState,
  type SelectionRange,
} from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';
import { useEventListener } from '@vueuse/core';
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { ColourMark } from '../toolbar/toolbar.types';

export interface EditorOverlayOptions {
  readonly frame: Readonly<Ref<HTMLElement | null>>;
  readonly content: Readonly<Ref<HTMLElement | null>>;
  readonly anchor: Readonly<Ref<HTMLElement | null>>;
  readonly view: () => EditorView | undefined;
  readonly state: () => EditorState;
  readonly run: (command: Command) => boolean;
  readonly focus: () => void;
  readonly bubble: () => boolean;
  readonly caret: () => boolean;
  readonly editable: () => boolean;
}

export interface EditorOverlays {
  readonly bubbleOpen: ComputedRef<boolean>;
  readonly focused: Readonly<Ref<boolean>>;
  readonly linkOpen: Ref<boolean>;
  readonly linkHref: Ref<string>;
  readonly linkRemovable: Ref<boolean>;
  readonly openLink: () => void;
  readonly applyLink: (href: string) => void;
  readonly removeLink: () => void;
  readonly closeLink: () => void;
  readonly colour: (mark: ColourMark, name: string | null) => void;
  readonly onFocusin: () => void;
  readonly onFocusout: (event: FocusEvent) => void;
  readonly onPointerdown: (event: PointerEvent) => void;
}

const wholeText = (doc: Doc): SelectionRange | undefined => {
  const from = textPosition(doc, 0, 1);
  const to = textPosition(doc, doc.size, -1);

  return from === undefined || to === undefined ? undefined : { from, to };
};

const shownRange = ({ doc, selection }: EditorState): SelectionRange =>
  (selection.kind === SelectionKind.All ? wholeText(doc) : undefined) ??
  selectionRange(doc, selection);

const isRange = (state: EditorState): boolean => {
  const { kind } = state.selection;
  const { from, to } = shownRange(state);

  return (kind === SelectionKind.Text || kind === SelectionKind.All) && from < to;
};

const hrefOf = (state: EditorState): string | undefined => {
  const href = markAttrs(state, 'link')?.href;

  return typeof href === 'string' ? href : undefined;
};

export const useEditorOverlays = (options: EditorOverlayOptions): EditorOverlays => {
  const inside = ref(false);
  const selecting = ref(false);
  const linkOpen = ref(false);
  const linkHref = ref('');
  const linkRemovable = ref(false);

  const bubbleOpen = computed(
    () =>
      options.bubble() &&
      options.editable() &&
      inside.value &&
      !selecting.value &&
      !linkOpen.value &&
      isRange(options.state()),
  );

  const place = (): void => {
    const view = bubbleOpen.value || linkOpen.value || options.caret() ? options.view() : undefined;
    const anchor = options.anchor.value;
    const frame = options.frame.value?.getBoundingClientRect();

    const range = view === undefined ? undefined : shownRange(view.state);

    const start = range === undefined ? undefined : view?.coordsAtPos(range.from);
    const end = range === undefined ? undefined : view?.coordsAtPos(range.to);

    if (anchor === null || frame === undefined || start === undefined || end === undefined) {
      return;
    }
    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);

    anchor.style.left = `${String(left - frame.left)}px`;
    anchor.style.top = `${String(start.top - frame.top)}px`;
    anchor.style.width = `${String(Math.max(1, right - left))}px`;
    anchor.style.height = `${String(Math.max(1, end.bottom - start.top))}px`;
  };

  const openLink = (): void => {
    const state = options.state();
    const href = hrefOf(state);

    linkHref.value = href ?? '';
    linkRemovable.value = href !== undefined;
    linkOpen.value = true;
  };

  const closeLink = (): void => {
    linkOpen.value = false;
    options.focus();
  };

  const applyLink = (href: string): void => {
    const state = options.state();
    const range = selectionRange(state.doc, state.selection);

    const collapsed =
      range.from === range.to && markExtent(state.doc, range.from, 'link') === undefined;

    options.run(collapsed ? insertMarked(href, 'link', { href }) : setMark('link', { href }));
    closeLink();
  };

  const removeLink = (): void => {
    options.run(setMark('link', null));
    closeLink();
  };

  const colour = (mark: ColourMark, name: string | null): void => {
    options.run(setMark(mark, name === null ? null : { name }));
    options.focus();
  };

  watch([options.state, bubbleOpen, linkOpen, options.caret], place, { flush: 'post' });

  useEventListener(globalThis, 'pointerup', () => {
    selecting.value = false;
  });

  return {
    bubbleOpen,
    focused: inside,
    linkOpen,
    linkHref,
    linkRemovable,
    openLink,
    applyLink,
    removeLink,
    closeLink,
    colour,
    onFocusin: () => {
      inside.value = true;
    },
    onFocusout: (event) => {
      const next = event.relatedTarget;

      inside.value = next instanceof Node && options.frame.value?.contains(next) === true;
    },
    onPointerdown: (event) => {
      const target = event.target;

      selecting.value = target instanceof Node && options.content.value?.contains(target) === true;
    },
  };
};
