<template>
  <div
    ref="root"
    class="nui-table__editor"
    :class="{ 'nui-table__editor--invalid': invalid }"
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
import { provideDraftCommits } from '@numior/primitives';
import { NuiTooltip } from '@numior/vue';
import type { NuiTableCellEditorProps, NuiTableEditMove } from './table.types';

const FOCUSABLE = 'input, textarea, select, button, [tabindex]';
const PINNED = '.nui-table__cell--pin-start, .nui-table__cell--pin-end';
const ERROR = '.nui-table__error';

const { spec, value, label, errorId, error, typed, passive, keep, attach, commit, cancel } =
  defineProps<NuiTableCellEditorProps>();

const emit = defineEmits<{ update: [value: unknown] }>();

const drafts = provideDraftCommits();
const root = useTemplateRef<HTMLElement>('root');
const control = useTemplateRef<{ focus?: () => void }>('control');
const message = ref(error ?? '');
let settled = false;
let popup = false;
let detach = (): void => undefined;

const invalid = computed(() => error !== undefined);

const keepOpen = (): void => undefined;

const finish = (move: NuiTableEditMove): void => {
  if (!settled) {
    settled = commit(move);
  }
};

const bound = computed(() => ({
  ...spec.props,
  [spec.model]: value,
  [`onUpdate:${spec.model}`]: (next: unknown) => {
    emit('update', next);

    if (popup) {
      finish('stay');
    }
  },
}));

const breaksLine = (event: KeyboardEvent): boolean =>
  event.key === 'Enter' && event.shiftKey && event.target instanceof HTMLTextAreaElement;

const fills = (event: KeyboardEvent): boolean =>
  event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;

const moveOf = (event: KeyboardEvent): NuiTableEditMove | undefined => {
  if (fills(event)) {
    return 'fill';
  }
  if (event.altKey || event.ctrlKey || event.metaKey || breaksLine(event)) {
    return undefined;
  }
  switch (event.key) {
    case 'Tab':
      return event.shiftKey ? 'previous' : 'next';
    case 'Enter':
      return event.shiftKey ? 'up' : 'down';
    default:
      return undefined;
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  event.stopPropagation();

  if (event.defaultPrevented || event.isComposing) {
    return;
  }
  const move = moveOf(event);

  if (move !== undefined) {
    event.preventDefault();
    finish(move);
  } else if (event.key === 'Escape') {
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
    if (root.value?.contains(document.activeElement) !== true) {
      finish('blur');
    }
  });
};

const onBeforetoggle = (event: Event): void => {
  if (
    !('newState' in event) ||
    (event.target instanceof Element && event.target.closest(ERROR) !== null)
  ) {
    return;
  }
  popup = event.newState === 'open';
};

const unfold = (): void => {
  const trigger = document.activeElement;

  if (
    trigger instanceof HTMLButtonElement &&
    trigger.hasAttribute('aria-haspopup') &&
    trigger.getAttribute('aria-expanded') !== 'true'
  ) {
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
  }
};

const onMousedown = (event: MouseEvent): void => {
  if (event.target instanceof Element && event.target.closest(FOCUSABLE) === null) {
    event.preventDefault();
  }
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

  if (accepted) {
    field.value = text;

    field.dispatchEvent(
      new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }),
    );
  }
};

const paddingOf = (length: string): number => Number.parseFloat(length) || 0;

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
  const rtl = style.direction === 'rtl';
  const start = paddingOf(style.scrollPaddingInlineStart);
  const end = paddingOf(style.scrollPaddingInlineEnd);
  const inner = viewport.getBoundingClientRect().left + viewport.clientLeft;
  const left = inner + (rtl ? end : start);
  const right = inner + viewport.clientWidth - (rtl ? start : end);
  const rect = cell.getBoundingClientRect();

  if (rect.left < left || rect.right > right) {
    cell.scrollIntoView?.({
      block: 'nearest',
      inline: rect.width <= right - left ? 'nearest' : 'start',
    });
  }
};

watch(
  () => error,
  (next) => {
    if (next !== undefined) {
      message.value = next;
    }
  },
);

onMounted(() => {
  detach = attach(() => {
    drafts.commitAll();
  });

  if (passive) {
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
    return;
  }
  if (typed !== undefined) {
    typeInto(field, typed);
  }
  field.setSelectionRange(field.value.length, field.value.length);
});

onBeforeUnmount(() => {
  detach();
});
</script>
