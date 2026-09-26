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
      <div v-if="ghostIndex >= 0" class="nui-field-array__ghost" aria-hidden="true">
        <NuiIcon alias="grip" class="nui-field-array__ghost-grip" />
        <span>{{ localized.row({ index: ghostIndex + 1 }) }}</span>
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
import { useControlId, useMessages, useReorder, type ReorderState } from '@numior/primitives';
import { NuiButton, NuiIcon } from '@numior/vue';
import { useFieldArray } from '../../field/use-field-array';
import { useFormScope } from '../form/form-scope';
import NuiFieldArrayRow from './NuiFieldArrayRow.vue';
import { fieldArrayMessages } from './field-array.messages';
import type { NuiFieldArrayProps } from './field-array.types';
import {
  FOCUSABLE,
  IDLE,
  focusRow,
  ghostOffset,
  indicatorOffset,
  rowsOf,
  targetIndex,
  type FocusPlan,
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

const plan: { focus: FocusPlan | undefined; dropped: boolean; previous: ReorderState } = {
  focus: undefined,
  dropped: false,
  previous: IDLE,
};

const grab = { offset: 0, height: 0 };

const isDisabled = computed(() => disabled ?? formScope?.disabled.value ?? false);

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
  },
);

const rows = array.fields;

const texts = computed(() => ({
  add: addLabel ?? localized.value.add,
  empty: emptyLabel ?? localized.value.empty,
  limit: localized.value.limit({ max: max ?? 0 }),
}));

const canAdd = computed(
  () => !isDisabled.value && newRow !== undefined && (max === undefined || rows.value.length < max),
);

const canRemove = computed(() => !isDisabled.value && rows.value.length > (min ?? 0));
const gripDisabled = computed(() => isDisabled.value || rows.value.length < 2);
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

const position = (state: ReorderState) => ({
  index: state.from + 1,
  position: state.to + 1,
  count: rows.value.length,
});

const announce = (state: ReorderState): void => {
  const { previous } = plan;

  if (state.phase === 'keyboard' && previous.phase !== 'keyboard') {
    plan.dropped = false;
    announcement.value = localized.value.grabbed(position(state));
  } else if (state.phase === 'keyboard' && state.to !== previous.to) {
    announcement.value = localized.value.moved(position(state));
  } else if (state.phase === 'idle' && previous.phase === 'keyboard' && !plan.dropped) {
    announcement.value = localized.value.cancelled({ index: previous.from + 1 });
  }
};

const place = (state: ReorderState): void => {
  const element = list.value;

  if (!element || state.phase === 'idle' || state.phase === 'pending') {
    return;
  }
  element.style.setProperty('--_indicator', `${indicatorOffset(element, state)}px`);
  element.style.setProperty('--_ghost', `${ghostOffset(element, state.position, grab)}px`);
};

const reorder = useReorder({
  axis: 'y',
  count: () => rows.value.length,
  container: () => list.value,
  indexAt: (client) => targetIndex(rowsOf(list.value), reorder.state.value.from, client),
  onMove: (from, to) => {
    const key = rows.value[from]?.key;

    plan.dropped = true;
    plan.focus = key === undefined ? undefined : { key, target: 'grip' };

    announcement.value = localized.value.dropped({
      index: from + 1,
      position: to + 1,
      count: rows.value.length,
    });

    void array.move(from, to);
  },
  onChange: (state) => {
    announce(state);
    place(state);
    plan.previous = state;
  },
});

const reordering = computed(() => {
  const { phase } = reorder.state.value;
  return phase === 'dragging' || phase === 'keyboard';
});

const classes = computed(() => ({
  'nui-field-array--reorderable': reorderable,
  'nui-field-array--reordering': reordering.value,
  'nui-field-array--disabled': isDisabled.value,
  'nui-field-array--invalid': array.errors.value.length > 0,
}));

const grabbedKey = computed(() =>
  reordering.value ? rows.value[reorder.state.value.from]?.key : undefined,
);

const ghostIndex = computed(() =>
  reorder.state.value.phase === 'dragging' ? reorder.state.value.from : -1,
);

const add = (): void => {
  if (!canAdd.value || !newRow) {
    return;
  }

  const index = rows.value.length;

  void array.push(newRow());

  const key = rows.value[index]?.key;

  plan.focus = key === undefined ? undefined : { key, target: 'control' };
  announcement.value = localized.value.added({ index: index + 1 });
};

const remove = (index: number): void => {
  if (!canRemove.value) {
    return;
  }

  const next = rows.value[index + 1] ?? rows.value[index - 1];

  plan.focus = next ? { key: next.key, target: 'control' } : { key: undefined, target: 'add' };
  announcement.value = localized.value.removed({ index: index + 1 });
  void array.remove(index);
};

const onGripPointerdown = (index: number, event: PointerEvent): void => {
  const row = rowsOf(list.value)[index];

  if (isDisabled.value || !row) {
    return;
  }

  const rect = row.getBoundingClientRect();

  grab.offset = event.clientY - rect.top;
  grab.height = rect.height;
  reorder.onPointerdown(index, event);
};

const onGripKeydown = (index: number, event: KeyboardEvent): void => {
  if (!isDisabled.value && reorder.onKeydown(index, event)) {
    event.preventDefault();
  }
};

watch(
  () => rows.value.map((row) => row.key).join(' '),
  () => {
    const focus = plan.focus;

    plan.focus = undefined;

    if (focus?.target === 'add') {
      focusArray();
    } else if (focus) {
      focusRow(list.value?.querySelector(`[id="${rowId(focus.key)}"]`), focus.target);
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
