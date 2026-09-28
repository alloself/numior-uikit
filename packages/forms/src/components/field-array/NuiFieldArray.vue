<template>
  <fieldset
    ref="root"
    class="nui-field-array"
    :class="classes"
    :disabled="fieldsetDisabled"
    :aria-describedby="describedBy"
  >
    <legend v-if="label || $slots.label" class="nui-field-array__label">
      <slot name="label">{{ label }}</slot>
    </legend>
    <p
      v-if="description || $slots.description"
      :id="descriptionId"
      class="nui-field-array__description"
    >
      <slot name="description">{{ description }}</slot>
    </p>
    <div ref="list" class="nui-field-array__list">
      <TransitionGroup
        tag="ol"
        role="list"
        class="nui-field-array__rows"
        enter-from-class="nui-field-array__row--collapsed"
        enter-active-class="nui-field-array__row--entering"
        leave-active-class="nui-field-array__row--leaving"
        leave-to-class="nui-field-array__row--collapsed"
        move-class="nui-field-array__row--moving"
      >
        <NuiFieldArrayRow
          v-for="row in rows"
          :id="rowId(row.key)"
          :key="row.key"
          :path="row.path"
          :form="form"
          :dragging="row.key === grabbedKey"
          :reorderable="reorderable"
          :removable="canRemove"
          :grip-disabled="gripDisabled"
          :move-label="moveText(row.index + 1)"
          :remove-label="removeText(row.index + 1)"
          @grab="onGripPointerdown(row.index, $event)"
          @grip-keydown="onGripKeydown(row.index, $event)"
          @remove="remove(row.index)"
        >
          <slot
            :row="row"
            :remove="() => remove(row.index)"
            :first="row.isFirst"
            :last="row.isLast"
          />
          <template v-if="$slots['row-actions']" #actions>
            <slot
              name="row-actions"
              :row="row"
              :remove="() => remove(row.index)"
              :can-remove="canRemove"
            />
          </template>
        </NuiFieldArrayRow>
      </TransitionGroup>
      <span class="nui-field-array__indicator" aria-hidden="true" />
      <div v-if="ghostRow !== undefined" class="nui-field-array__ghost" aria-hidden="true">
        <NuiIcon alias="grip" class="nui-field-array__ghost-grip" />
        <span>{{ localized.row({ index: ghostRow + 1 }) }}</span>
      </div>
    </div>
    <p v-if="array.errorMessage.value" :id="errorId" class="nui-field-array__error">
      {{ array.errorMessage.value }}
    </p>
    <p v-if="rows.length === 0" class="nui-field-array__empty">
      <slot name="empty">{{ texts.empty }}</slot>
    </p>
    <div class="nui-field-array__footer">
      <slot name="add" :push="add" :can-add="canAdd">
        <NuiButton
          v-if="newRow"
          ref="addButton"
          class="nui-field-array__add"
          variant="outline"
          tone="neutral"
          size="sm"
          :disabled="!canAdd"
          @click="add"
        >
          <NuiIcon alias="plus" />
          {{ texts.add }}
        </NuiButton>
      </slot>
      <span v-if="limitReached" class="nui-field-array__limit">{{ texts.limit }}</span>
    </div>
    <span class="nui-field-array__live" aria-live="polite">{{ announcement }}</span>
  </fieldset>
</template>

<script setup lang="ts" generic="T extends object, R">
import { computed, shallowRef, toRef, useTemplateRef, watch } from 'vue';
import {
  createIntent,
  useControlId,
  useMessages,
  useReorder,
  type ReorderEvent,
  type ReorderState,
} from '@numior/primitives';
import { NuiButton, NuiIcon } from '@numior/vue';
import { useFieldArray } from '../../field/use-field-array';
import { provideFormScope, useFormScope } from '../form/form-scope';
import NuiFieldArrayRow from './NuiFieldArrayRow.vue';
import { fieldArrayMessages } from './field-array.messages';
import type { NuiFieldArrayProps } from './field-array.types';
import {
  FOCUSABLE,
  focusRow,
  indicatorOffset,
  pointerOffset,
  rowsOf,
  targetIndex,
  type RowFocus,
} from './reorder-geometry';

const {
  name,
  form,
  label,
  description,
  min = undefined,
  max = undefined,
  newRow,
  reorderable = false,
  disabled = undefined,
  readonly = undefined,
  rules,
  validateOn,
  addLabel,
  emptyLabel,
  removeLabel,
  moveLabel,
} = defineProps<NuiFieldArrayProps<T, R>>();

const root = useTemplateRef<HTMLFieldSetElement>('root');
const list = useTemplateRef<HTMLElement>('list');
const addButton = useTemplateRef<InstanceType<typeof NuiButton>>('addButton');
const formScope = useFormScope();
const localized = useMessages(fieldArrayMessages);
const baseId = useControlId(() => undefined);
const announcement = shallowRef('');

const focus = createIntent<RowFocus>();

const isDisabled = computed(() => disabled ?? formScope?.disabled.value ?? false);
const isReadonly = computed(() => readonly ?? formScope?.readonly.value ?? false);
const isInert = computed(() => isDisabled.value || isReadonly.value);

provideFormScope({
  disabled: () => isDisabled.value,
  readonly: () => isReadonly.value,
  reserveError: () => formScope?.reserveError.value ?? false,
});

const addElement = (): HTMLElement | null => {
  const element: unknown = addButton.value?.$el;
  return element instanceof HTMLElement ? element : null;
};

const focusArray = (): void => {
  const target = addElement() ?? root.value?.querySelector(FOCUSABLE);

  if (target instanceof HTMLElement) {
    target.focus();
  }
};

const array = useFieldArray(
  toRef(() => name),
  {
    form,
    rules: () => rules,
    validateOn: () => validateOn,
    label: () => label,
    element: () => root.value,
    focus: focusArray,
    disabled: () => isDisabled.value,
    readonly: () => isReadonly.value,
  },
);

const rows = array.fields;

const texts = computed(() => ({
  add: addLabel ?? localized.value.add,
  empty: emptyLabel ?? localized.value.empty,
  limit: localized.value.limit({ max: max ?? 0 }),
}));

const canAdd = computed(
  () => !isInert.value && newRow !== undefined && (max === undefined || rows.value.length < max),
);

const canRemove = computed(() => !isInert.value && rows.value.length > (min ?? 0));
const gripDisabled = computed(() => isInert.value || rows.value.length < 2);
const fieldsetDisabled = computed(() => isDisabled.value || undefined);
const limitReached = computed(() => max !== undefined && rows.value.length >= max);
const descriptionId = computed(() => `${baseId.value}-description`);
const errorId = computed(() => `${baseId.value}-error`);

const describedBy = computed(
  () =>
    [
      ...(description ? [descriptionId.value] : []),
      ...(array.errorMessage.value ? [errorId.value] : []),
    ].join(' ') || undefined,
);

const rowId = (key: string): string => `${baseId.value}-row-${key}`;

const removeText = (index: number): string =>
  removeLabel?.(index) ?? localized.value.remove({ index });

const moveText = (index: number): string => moveLabel?.(index) ?? localized.value.move({ index });

const position = (from: number, to: number) => ({
  index: from + 1,
  position: to + 1,
  count: rows.value.length,
});

const announce = (event: ReorderEvent): void => {
  switch (event.type) {
    case 'grabbed':
      announcement.value = localized.value.grabbed(position(event.from, event.from));
      break;
    case 'moved':
      announcement.value = localized.value.moved(position(event.from, event.to));
      break;
    case 'dropped':
      announcement.value = localized.value.dropped(position(event.from, event.to));
      break;
    case 'cancelled':
      announcement.value = localized.value.cancelled({ index: event.from + 1 });
      break;
  }
};

const place = (state: ReorderState): void => {
  const element = list.value;

  if (!element) {
    return;
  }

  switch (state.phase) {
    case 'dragging':
      element.style.setProperty(
        '--_indicator',
        `${indicatorOffset(element, state.from, state.to)}px`,
      );

      element.style.setProperty('--_ghost', `${pointerOffset(element, state.position)}px`);
      break;
    case 'keyboard':
      element.style.setProperty(
        '--_indicator',
        `${indicatorOffset(element, state.from, state.to)}px`,
      );

      break;
    case 'idle':
    case 'pending':
      break;
  }
};

const reorder = useReorder({
  axis: 'y',
  count: () => rows.value.length,
  container: () => list.value,
  indexAt: (client, from) => targetIndex(rowsOf(list.value), from, client),
  onMove: (from, to) => {
    const key = rows.value[from]?.key;

    focus.set(key === undefined ? undefined : { kind: 'row', key, part: 'grip' });
    void array.move(from, to);
  },
  onChange: place,
  onEvent: announce,
});

const reordering = computed(() => {
  const { phase } = reorder.state.value;
  return phase === 'dragging' || phase === 'keyboard';
});

const classes = computed(() => ({
  'nui-field-array--reorderable': reorderable,
  'nui-field-array--reordering': reordering.value,
  'nui-field-array--disabled': isDisabled.value,
  'nui-field-array--readonly': isReadonly.value,
  'nui-field-array--invalid': array.errors.value.length > 0,
}));

const grabbedKey = computed(() => {
  const state = reorder.state.value;

  return state.phase === 'dragging' || state.phase === 'keyboard'
    ? rows.value[state.from]?.key
    : undefined;
});

const ghostRow = computed(() => {
  const state = reorder.state.value;
  return state.phase === 'dragging' ? state.from : undefined;
});

const add = (): void => {
  if (!canAdd.value || !newRow) {
    return;
  }

  const index = rows.value.length;

  void array.push(newRow());

  const key = rows.value[index]?.key;

  focus.set(key === undefined ? undefined : { kind: 'row', key, part: 'control' });
  announcement.value = localized.value.added({ index: index + 1 });
};

const remove = (index: number): void => {
  if (!canRemove.value) {
    return;
  }

  const next = rows.value[index + 1] ?? rows.value[index - 1];

  focus.set(next ? { kind: 'row', key: next.key, part: 'control' } : { kind: 'add' });
  announcement.value = localized.value.removed({ index: index + 1 });
  void array.remove(index);
};

const onGripPointerdown = (index: number, event: PointerEvent): void => {
  if (!isInert.value) {
    reorder.onPointerdown(index, event);
  }
};

const onGripKeydown = (index: number, event: KeyboardEvent): void => {
  if (!isInert.value && reorder.onKeydown(index, event)) {
    event.preventDefault();
  }
};

watch(
  () => rows.value.map((row) => row.key).join(' '),
  () => {
    const target = focus.take();

    switch (target?.kind) {
      case 'add':
        focusArray();
        break;
      case 'row':
        focusRow(list.value?.querySelector(`[id="${rowId(target.key)}"]`), target.part);
        break;
    }
  },
  { flush: 'post' },
);

defineExpose({
  push: (value: R) => array.push(value),
  remove,
  move: (from: number, to: number) => array.move(from, to),
});
</script>
