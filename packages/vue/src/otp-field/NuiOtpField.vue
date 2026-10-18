<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      ref="root"
      class="nui-otp-field"
      :class="[
        `nui-otp-field--size-${size}`,
        {
          'nui-otp-field--secret': secret,
          'nui-otp-field--invalid': isInvalid,
          'nui-otp-field--disabled': isDisabled,
          'nui-otp-field--readonly': isReadonly,
        },
      ]"
      v-bind="split.rootAttrs()"
    >
      <div class="nui-otp-field__slots" aria-hidden="true">
        <template v-for="(group, groupIndex) in layout" :key="groupIndex">
          <span v-if="groupIndex > 0" class="nui-otp-field__separator">
            <slot name="separator">
              <NuiIcon icon="minus" />
            </slot>
          </span>
          <span class="nui-otp-field__group">
            <NuiOtpSlot
              v-for="index in group"
              :key="index"
              :char="code[index]"
              :active="isActive(index)"
              :revealed="revealed === index"
              :caret="caret === index"
              :secret="secret"
              :placeholder="placeholder"
            />
          </span>
        </template>
      </div>
      <div class="nui-otp-field__overlay">
        <input
          ref="input"
          class="nui-otp-field__control"
          :type="secret ? 'password' : 'text'"
          :inputmode="charset === 'digits' ? 'numeric' : 'text'"
          :pattern="charset === 'digits' ? '\\d*' : undefined"
          :autocapitalize="charset === 'digits' ? undefined : 'characters'"
          :autocomplete="secret ? 'off' : 'one-time-code'"
          spellcheck="false"
          v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
          :value="code"
          @beforeinput="onBeforeinput"
          @input="onInput"
          @compositionend="onCompositionend"
          @paste="onPaste"
          @keydown="onKeydown"
          @pointerdown="onPointerdown"
          @pointercancel="onPointercancel"
          @click="onClick"
          @focus="onFocus"
          @blur="onBlur"
        />
      </div>
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { useEventListener, useTimeoutFn } from '@vueuse/core';
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import {
  createIntent,
  normalizeOtp,
  otpGroups,
  otpLength,
  pasteOtp,
  reconcileOtp,
  selectOtpSlot,
  settleOtpCaret,
  useFieldControl,
  useSplitAttrs,
  useWebOtp,
  type OtpDirection,
  type OtpEdit,
  type OtpSelection,
} from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiOtpSlot from './NuiOtpSlot.vue';
import type { NuiOtpFieldProps } from './otp-field.types';

type SlotMove = 'previous' | 'next' | 'first' | 'last';

const REVEAL_DURATION = 1000;

const BACKWARD_INPUTS: ReadonlySet<string> = new Set([
  'deleteContentBackward',
  'deleteWordBackward',
  'deleteSoftLineBackward',
  'deleteHardLineBackward',
]);

const SLOT_MOVES: ReadonlyMap<string, SlotMove> = new Map([
  ['ArrowLeft', 'previous'],
  ['ArrowRight', 'next'],
  ['Home', 'first'],
  ['End', 'last'],
]);

const sameSelection = (current: OtpSelection | null, next: OtpSelection): boolean =>
  current !== null && current.start === next.start && current.end === next.end;

const covers = (selection: OtpSelection | null, index: number): boolean => {
  if (selection === null) {
    return false;
  }
  return selection.start === selection.end
    ? index === selection.start
    : index >= selection.start && index < selection.end;
};

const selectionOf = (element: HTMLInputElement): OtpSelection => {
  const start = element.selectionStart ?? element.value.length;

  return { start, end: element.selectionEnd ?? start };
};

const hasModifier = (event: KeyboardEvent): boolean =>
  event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
  readonly = undefined,
  length = 6,
  groupSize,
  charset = 'digits',
  secret = false,
  placeholder,
  webOtp = false,
} = defineProps<NuiOtpFieldProps>();

const model = defineModel<string>({ default: '' });

const emit = defineEmits<{
  complete: [code: string];
}>();

const split = useSplitAttrs();

const {
  frame: fieldFrame,
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(() => ({
  id,
  disabled,
  readonly,
  required,
  invalid,
  label,
  description,
  error,
}));

const rootElement = useTemplateRef<HTMLDivElement>('root');
const inputElement = useTemplateRef<HTMLInputElement>('input');
const selection = shallowRef<OtpSelection | null>(null);
const revealed = shallowRef<number | null>(null);
const pointed = createIntent<number>();

const count = computed(() => otpLength(length));
const code = computed(() => normalizeOtp(model.value, charset).slice(0, count.value));

const layout = computed(() => {
  let offset = 0;

  return otpGroups(length, groupSize).map((span) => {
    const slots = Array.from({ length: span }, (_, index) => offset + index);
    offset += span;
    return slots;
  });
});

const caret = computed(() => {
  const current = selection.value;

  return current !== null && current.start === current.end && !isReadonly.value
    ? current.start
    : null;
});

const isActive = (index: number): boolean => covers(selection.value, index);

const hide = useTimeoutFn(
  () => {
    revealed.value = null;
  },
  REVEAL_DURATION,
  { immediate: false },
);

const reveal = (index: number | null): void => {
  hide.stop();
  revealed.value = index;
  if (index !== null) {
    hide.start();
  }
};

const select = (element: HTMLInputElement, next: OtpSelection): void => {
  if (element.selectionStart !== next.start || element.selectionEnd !== next.end) {
    element.setSelectionRange(next.start, next.end);
  }
  if (!sameSelection(selection.value, next)) {
    selection.value = next;
  }
};

const selectSlot = (element: HTMLInputElement, index: number): void => {
  select(element, selectOtpSlot(code.value, count.value, index));
};

const store = (element: HTMLInputElement, value: string): void => {
  if (element.value !== value) {
    element.value = value;
  }
  if (value === code.value) {
    return;
  }
  model.value = value;
  if (value.length === count.value) {
    emit('complete', value);
  }
};

const apply = (element: HTMLInputElement, edit: OtpEdit, direction: OtpDirection): void => {
  store(element, edit.value);
  select(element, settleOtpCaret(edit.value, count.value, edit.caret, direction));
};

const restore = (element: HTMLInputElement): void => {
  element.value = code.value;
  if (selection.value !== null) {
    element.setSelectionRange(selection.value.start, selection.value.end);
  }
};

const isRefused = (event: Event): boolean =>
  event instanceof InputEvent &&
  event.inputType.startsWith('insert') &&
  event.data !== null &&
  normalizeOtp(event.data, charset) === '';

const onBeforeinput = (event: InputEvent): void => {
  pointed.set(undefined);
  if (!event.isComposing && isRefused(event)) {
    event.preventDefault();
  }
};

const onInput = (event: Event): void => {
  const element = inputElement.value;
  pointed.set(undefined);
  if (!element || (event instanceof InputEvent && event.isComposing)) {
    return;
  }
  if (isRefused(event)) {
    restore(element);
    return;
  }
  const type = event instanceof InputEvent ? event.inputType : '';
  const edit = reconcileOtp(element.value, selectionOf(element).start, count.value, charset);
  const typed = type === 'insertText' && edit.value !== code.value && edit.caret > 0;

  reveal(secret && typed ? edit.caret - 1 : null);
  apply(element, edit, BACKWARD_INPUTS.has(type) ? 'backward' : 'forward');
};

const onCompositionend = (): void => {
  const element = inputElement.value;
  if (element) {
    apply(
      element,
      reconcileOtp(element.value, selectionOf(element).start, count.value, charset),
      'forward',
    );
  }
};

const onPaste = (event: ClipboardEvent): void => {
  const element = inputElement.value;
  pointed.set(undefined);
  if (!element || isReadonly.value) {
    return;
  }
  event.preventDefault();
  const text = event.clipboardData?.getData('text') ?? '';

  reveal(null);
  apply(element, pasteOtp(code.value, count.value, selectionOf(element), text, charset), 'forward');
};

const targetOf = (move: SlotMove, active: number): number => {
  switch (move) {
    case 'previous':
      return active - 1;
    case 'next':
      return active + 1;
    case 'first':
      return 0;
    case 'last':
      return count.value;
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  const move = SLOT_MOVES.get(event.key);
  const element = inputElement.value;
  pointed.set(undefined);
  if (move === undefined || !element || hasModifier(event)) {
    return;
  }
  event.preventDefault();
  selectSlot(element, targetOf(move, selectionOf(element).start));
};

const slotIndexAt = (x: number): number => {
  const slots = rootElement.value?.querySelectorAll('.nui-otp-field__slot') ?? [];
  const index = [...slots].findIndex((slot) => slot.getBoundingClientRect().right > x);

  return index === -1 ? count.value : index;
};

const onPointerdown = (event: PointerEvent): void => {
  pointed.set(event.isPrimary && event.button === 0 ? slotIndexAt(event.clientX) : undefined);
};

const onPointercancel = (): void => {
  pointed.set(undefined);
};

const onClick = (event: MouseEvent): void => {
  const element = inputElement.value;
  const index = event.detail < 2 ? slotIndexAt(event.clientX) : undefined;

  pointed.set(index);
  if (element && index !== undefined) {
    selectSlot(element, index);
  }
};

const onFocus = (): void => {
  const element = inputElement.value;
  if (element) {
    selectSlot(element, pointed.peek() ?? count.value);
  }
};

const onBlur = (): void => {
  pointed.set(undefined);
  selection.value = null;
  reveal(null);
};

const onSelectionchange = (): void => {
  const element = inputElement.value;
  if (!element || element.ownerDocument.activeElement !== element) {
    return;
  }
  const current = selectionOf(element);
  const index = pointed.take();

  if (index !== undefined) {
    selectSlot(element, index);
  } else if (current.start === current.end) {
    selectSlot(element, current.start);
  } else {
    select(element, current);
  }
};

const receive = (text: string): void => {
  const element = inputElement.value;
  if (!element) {
    return;
  }
  const value = normalizeOtp(text, charset).slice(0, count.value);

  reveal(null);
  store(element, value);
  if (selection.value !== null) {
    select(element, selectOtpSlot(value, count.value, count.value));
  }
};

watch(code, (value) => {
  const element = inputElement.value;
  if (!element || selection.value === null || element.value === value) {
    return;
  }
  reveal(null);
  selection.value = selectOtpSlot(value, count.value, count.value);
});

onMounted(() => {
  watch(
    selection,
    (next) => {
      const element = inputElement.value;
      if (next !== null && element && element.ownerDocument.activeElement === element) {
        select(element, next);
      }
    },
    { flush: 'post' },
  );
});

useEventListener(
  () => (selection.value === null ? undefined : inputElement.value?.ownerDocument),
  'selectionchange',
  onSelectionchange,
);

useWebOtp({
  enabled: () =>
    webOtp && !isDisabled.value && !isReadonly.value && code.value.length < count.value,
  onCode: receive,
});

defineExpose({ focus: () => inputElement.value?.focus() });
</script>
