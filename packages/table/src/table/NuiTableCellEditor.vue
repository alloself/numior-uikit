<template>
  <div
    ref="root"
    class="nui-table__editor"
    :class="{ 'nui-table__editor--invalid': invalid, 'nui-table__editor--grow': grow }"
    @keydown="onKeydown"
    @focusout="onFocusout"
    @mousedown="onMousedown"
    @beforetoggle.capture="onBeforetoggle"
  >
    <component
      :is="spec.component"
      ref="control"
      v-bind="bound"
      size="sm"
      :invalid="invalid"
      :aria-label="label"
      :aria-errormessage="invalid ? errorId : undefined"
    />
    <NuiTooltip
      :id="errorId"
      class="nui-table__error"
      :open="invalid"
      :anchor="root"
      placement="bottom-start"
      @update:open="keepOpen"
    >
      {{ message }}
    </NuiTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { AriaValue, Direction, Key, PopoverState, provideDraftCommits } from '@numior/primitives';
import { NuiTooltip } from '@numior/vue';
import { grownSize, growthEdges } from './table-editor-growth';
import { holdScrollAfterResize } from './table-scroll-hold';
import type { NuiTableCellEditorProps, NuiTableEditMove } from './table.types';

const FOCUSABLE = 'input, textarea, select, button, [tabindex]';
const SIZE = '--_size';
const LIFT = '--_lift';
const LIFTED = 'var(--nui-shadow-md)';
const NEIGHBOURS = 64;
const ALIGNED_END = '.nui-table__cell--align-end';
const CARET = 4;
const PINNED = '.nui-table__cell--pin-start, .nui-table__cell--pin-end';
const ERROR = '.nui-table__error';

const {
  spec,
  value,
  label,
  errorId,
  error,
  typed,
  passive,
  grow,
  keep,
  pick,
  attach,
  commit,
  cancel,
} = defineProps<NuiTableCellEditorProps>();

const emit = defineEmits<{ update: [value: unknown] }>();

const drafts = provideDraftCommits();
const root = useTemplateRef<HTMLElement>('root');
const control = useTemplateRef<{ focus?: () => void }>('control');
const message = ref(error ?? '');
let settled = false;
let popup = false;
let detach = (): void => undefined;
let unhold = (): void => undefined;
let echoed: { value: unknown } | undefined;

const invalid = computed(() => error !== undefined);

const keepOpen = (): void => undefined;

const finish = (move: NuiTableEditMove): void => {
  if (settled) {
    return;
  }

  settled = commit(move);
};

const bound = computed(() => ({
  ...spec.props,
  [spec.model]: value,
  [`onUpdate:${spec.model}`]: (next: unknown) => {
    echoed = { value: next };
    emit('update', next);

    if (!popup) {
      return;
    }

    finish('stay');
  },
}));

const breaksLine = (event: KeyboardEvent): boolean =>
  event.key === Key.Enter && event.shiftKey && event.target instanceof HTMLTextAreaElement;

const fills = (event: KeyboardEvent): boolean =>
  event.key === Key.Enter && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;

const moveOf = (event: KeyboardEvent): NuiTableEditMove | undefined => {
  if (fills(event)) {
    return 'fill';
  }
  if (event.altKey || event.ctrlKey || event.metaKey || breaksLine(event)) {
    return undefined;
  }
  switch (event.key) {
    case Key.Tab:
      return event.shiftKey ? 'previous' : 'next';
    case Key.Enter:
      return event.shiftKey ? 'up' : 'down';
    default:
      return undefined;
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  event.stopPropagation();

  if (event.defaultPrevented || event.isComposing || pick?.(event) === true) {
    return;
  }
  const move = moveOf(event);

  if (move !== undefined) {
    event.preventDefault();
    finish(move);
  } else if (event.key === Key.Escape) {
    event.preventDefault();
    settled = true;
    cancel();
  }
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  if (
    (next instanceof Node && root.value?.contains(next) === true) ||
    (next instanceof Element && keep?.(next) === true)
  ) {
    return;
  }

  queueMicrotask(() => {
    if (root.value?.contains(document.activeElement) === true) {
      return;
    }

    finish('blur');
  });
};

const onBeforetoggle = (event: Event): void => {
  if (
    !('newState' in event) ||
    (event.target instanceof Element && event.target.closest(ERROR) !== null)
  ) {
    return;
  }
  popup = event.newState === PopoverState.Open;
};

const unfold = (): void => {
  const trigger = document.activeElement;

  if (
    !(trigger instanceof HTMLButtonElement) ||
    !trigger.hasAttribute('aria-haspopup') ||
    trigger.getAttribute('aria-expanded') === AriaValue.True
  ) {
    return;
  }

  trigger.dispatchEvent(
    new KeyboardEvent('keydown', { key: Key.ArrowDown, bubbles: true, cancelable: true }),
  );
};

const onMousedown = (event: MouseEvent): void => {
  if (!(event.target instanceof Element) || event.target.closest(FOCUSABLE) !== null) {
    return;
  }

  event.preventDefault();
};

const fieldOf = (): HTMLInputElement | HTMLTextAreaElement | undefined => {
  const field = document.activeElement;

  return (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
    root.value?.contains(field) === true
    ? field
    : undefined;
};

const typeInto = (field: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  const accepted = field.dispatchEvent(
    new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true,
    }),
  );

  if (!accepted) {
    return;
  }

  field.value = text;

  field.dispatchEvent(
    new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }),
  );
};

const paddingOf = (length: string): number => Number.parseFloat(length) || 0;

const growsBack = (editor: HTMLElement): boolean => editor.closest(ALIGNED_END) !== null;

const roomOf = (editor: HTMLElement, viewport: HTMLElement, back: boolean): number => {
  const style = getComputedStyle(viewport);
  const rtl = style.direction === Direction.Rtl;
  const box = viewport.getBoundingClientRect();
  const start = box.left + viewport.clientLeft;
  const end = box.right - (viewport.offsetWidth - viewport.clientWidth - viewport.clientLeft);
  const rect = editor.getBoundingClientRect();

  const padding = paddingOf(back ? style.scrollPaddingInlineStart : style.scrollPaddingInlineEnd);

  return Math.floor(rtl === back ? end - padding - rect.left : rect.right - start - padding);
};

const neighbourWidths = (editor: HTMLElement, back: boolean): readonly number[] => {
  const widths: number[] = [];
  const cell = editor.closest('.nui-table__cell');
  let next = back ? cell?.previousElementSibling : cell?.nextElementSibling;

  while (next instanceof HTMLElement && widths.length < NEIGHBOURS) {
    widths.push(next.getBoundingClientRect().width);
    next = back ? next.previousElementSibling : next.nextElementSibling;
  }
  return widths;
};

const widen = (editor: HTMLElement, field: HTMLInputElement, viewport: HTMLElement): void => {
  editor.style.removeProperty(SIZE);
  editor.style.removeProperty(LIFT);

  const overflow = field.scrollWidth - field.clientWidth;

  if (overflow <= 0) {
    return;
  }

  const back = growsBack(editor);
  const natural = editor.getBoundingClientRect().width;
  const edges = growthEdges(natural, neighbourWidths(editor, back));
  const grown = grownSize(edges, natural + overflow + CARET, roomOf(editor, viewport, back));

  if (grown <= natural) {
    return;
  }

  editor.style.setProperty(SIZE, `${String(grown)}px`);
  editor.style.setProperty(LIFT, LIFTED);
};

const fit = (hold: boolean): void => {
  const editor = root.value;
  const field = editor?.querySelector('input');
  const viewport = editor?.closest('.nui-table__viewport');

  if (
    !grow ||
    !(editor instanceof HTMLElement) ||
    !(field instanceof HTMLInputElement) ||
    !(viewport instanceof HTMLElement)
  ) {
    return;
  }
  unhold();
  widen(editor, field, viewport);

  if (!hold) {
    return;
  }

  unhold = holdScrollAfterResize(editor);
};

const reveal = (): void => {
  const cell = root.value?.closest('.nui-table__cell');
  const viewport = cell?.closest('.nui-table__viewport');

  if (
    !(cell instanceof HTMLElement) ||
    !(viewport instanceof HTMLElement) ||
    cell.matches(PINNED)
  ) {
    return;
  }
  const style = getComputedStyle(viewport);
  const rtl = style.direction === Direction.Rtl;
  const start = paddingOf(style.scrollPaddingInlineStart);
  const end = paddingOf(style.scrollPaddingInlineEnd);
  const inner = viewport.getBoundingClientRect().left + viewport.clientLeft;
  const left = inner + (rtl ? end : start);
  const right = inner + viewport.clientWidth - (rtl ? start : end);
  const rect = cell.getBoundingClientRect();

  if (rect.left >= left && rect.right <= right) {
    return;
  }

  cell.scrollIntoView?.({
    block: 'nearest',
    inline: rect.width <= right - left ? 'nearest' : 'start',
  });
};

watch(
  () => value,
  (next) => {
    const own = echoed !== undefined && Object.is(echoed.value, next);

    echoed = undefined;
    fit(!own);
  },
  { flush: 'post' },
);

watch(
  () => error,
  (next) => {
    if (next === undefined) {
      return;
    }

    message.value = next;
  },
);

onMounted(() => {
  detach = attach(() => {
    drafts.commitAll();
  });

  if (passive) {
    fit(false);
    reveal();
    return;
  }
  control.value?.focus?.();

  if (root.value?.contains(document.activeElement) !== true) {
    root.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }
  reveal();
  unfold();

  const field = fieldOf();

  if (field === undefined || field.selectionStart === null) {
    fit(false);
    return;
  }
  if (typed !== undefined) {
    typeInto(field, typed);
  }
  field.setSelectionRange(field.value.length, field.value.length);
  fit(false);
});

onBeforeUnmount(() => {
  unhold();
  detach();
});
</script>
