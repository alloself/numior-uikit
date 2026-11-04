<template>
  <div
    ref="content"
    class="nui-popover nui-table-filter"
    role="dialog"
    :aria-label="title"
    v-bind="contentAttrs"
    @toggle="onToggle"
    @keydown.esc.stop
  >
    <form class="nui-table-filter__form" @submit.prevent="apply">
      <p class="nui-table-filter__title">{{ title }}</p>
      <template v-if="draft.kind === NuiTableFilterKind.Text">
        <NuiSelect v-model="draft.op" :options="operators" :label="texts.operator" size="sm" />
        <NuiInput
          v-if="draft.op !== TableTextOp.Empty"
          v-model="draft.value"
          :label="texts.value"
          size="sm"
        />
      </template>
      <template v-else-if="draft.kind === NuiTableFilterKind.Number">
        <NuiNumberField v-model="draft.min" :label="texts.min" :locale="locale" size="sm" />
        <NuiNumberField v-model="draft.max" :label="texts.max" :locale="locale" size="sm" />
      </template>
      <template v-else-if="draft.kind === NuiTableFilterKind.Date">
        <NuiDatePicker v-model="draft.from" :label="texts.from" :locale="locale" size="sm" />
        <NuiDatePicker v-model="draft.to" :label="texts.to" :locale="locale" size="sm" />
      </template>
      <template v-else>
        <NuiCheckbox
          :model-value="allChosen"
          :indeterminate="someChosen"
          size="sm"
          @update:model-value="chooseAll"
        >
          {{ texts.selectAll }}
        </NuiCheckbox>
        <div class="nui-table-filter__values" role="group" :aria-label="title">
          <NuiCheckbox
            v-for="option in options"
            :key="option.key"
            :model-value="chosen(option.value)"
            size="sm"
            @update:model-value="toggle(option.value)"
          >
            {{ option.label }}
          </NuiCheckbox>
        </div>
        <p v-if="truncated" class="nui-table-filter__note">{{ texts.truncated }}</p>
      </template>
      <div class="nui-table-filter__actions">
        <NuiButton type="button" variant="ghost" tone="neutral" size="sm" @click="reset">
          {{ texts.reset }}
        </NuiButton>
        <NuiButton type="submit" size="sm">{{ texts.apply }}</NuiButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue';
import {
  PopoverMode,
  PopoverState,
  useFloating,
  useMessages,
  usePopover,
} from '@numior/primitives';
import {
  NuiButton,
  NuiCheckbox,
  NuiDatePicker,
  NuiInput,
  NuiNumberField,
  NuiSelect,
} from '@numior/vue';
import { TableTextOp, type TableFilterValue } from '../engine';
import { tableMessages } from './table.messages';
import { draftOf, filterFromDraft, type FilterDraft } from './table-filter';
import {
  NuiTableFilterKind,
  type NuiTableColumnFilter,
  type NuiTableFilterProps,
} from './table.types';

interface ValueOption {
  readonly key: string;
  readonly value: TableFilterValue;
  readonly label: string;
}

const { title, kind, columnKey, filter, anchor, locale, loadValues, valueLabel } =
  defineProps<NuiTableFilterProps>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{ apply: [filter: NuiTableColumnFilter | null] }>();

const content = useTemplateRef<HTMLElement>('content');
const messages = useMessages(tableMessages, () => locale);
const draft = ref<FilterDraft>(draftOf(kind, filter));
const values = shallowRef<readonly TableFilterValue[]>([]);
const truncated = ref(false);

const { contentAttrs } = usePopover(content, { open, mode: PopoverMode.Auto });

useFloating(() => anchor, content, {
  placement: 'bottom-start',
  offset: 4,
  enabled: open,
});

const texts = computed(() => ({
  operator: messages.value.filterOperator,
  value: messages.value.filterValue,
  min: messages.value.filterMin,
  max: messages.value.filterMax,
  from: messages.value.filterFrom,
  to: messages.value.filterTo,
  selectAll: messages.value.filterSelectAll,
  truncated: messages.value.filterTruncated,
  apply: messages.value.filterApply,
  reset: messages.value.filterReset,
}));

const operators = computed(() => {
  const labels: Readonly<Record<TableTextOp, string>> = {
    contains: messages.value.filterContains,
    equals: messages.value.filterEquals,
    starts: messages.value.filterStarts,
    empty: messages.value.filterEmpty,
  };

  return (['contains', 'equals', 'starts', 'empty'] as const).map((op) => ({
    value: op,
    label: labels[op],
  }));
});

const options = computed<readonly ValueOption[]>(() =>
  values.value.map((value, index) => ({ key: `${index}`, value, label: valueLabel(value) })),
);

const chosenValues = (): readonly TableFilterValue[] =>
  draft.value.kind === NuiTableFilterKind.Set ? draft.value.values : [];

const chosen = (value: TableFilterValue): boolean => chosenValues().includes(value);

const allChosen = computed(
  () => options.value.length > 0 && chosenValues().length === options.value.length,
);

const someChosen = computed(() => chosenValues().length > 0 && !allChosen.value);

const toggle = (value: TableFilterValue): void => {
  const current = draft.value;

  if (current.kind === NuiTableFilterKind.Set) {
    current.values = chosen(value)
      ? current.values.filter((entry) => entry !== value)
      : [...current.values, value];
  }
};

const chooseAll = (checked: boolean): void => {
  const current = draft.value;

  if (current.kind === NuiTableFilterKind.Set) {
    current.values = checked ? options.value.map((option) => option.value) : [];
  }
};

const load = async (): Promise<void> => {
  const result = await loadValues();

  if (result !== null) {
    values.value = result.values;
    truncated.value = result.truncated;
  }
};

const close = (next: NuiTableColumnFilter | null): void => {
  emit('apply', next);
  open.value = false;
};

const apply = (): void => {
  close(filterFromDraft(columnKey, draft.value));
};

const reset = (): void => {
  close(null);
};

const firstControl = (): HTMLElement | null | undefined =>
  content.value?.querySelector<HTMLElement>('input, button');

const focusStrayed = (): boolean => {
  const focused = document.activeElement;

  return (
    focused === null ||
    focused === document.body ||
    content.value?.contains(focused) === true ||
    (focused !== anchor && anchor?.contains(focused) === true)
  );
};

const onToggle = (event: Event): void => {
  if (!('newState' in event)) {
    return;
  }
  if (event.newState === PopoverState.Open) {
    firstControl()?.focus({ preventScroll: true });
  } else if (focusStrayed()) {
    anchor?.focus({ preventScroll: true });
  }
};

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      draft.value = draftOf(kind, filter);

      if (kind === NuiTableFilterKind.Set) {
        void load();
      }
    }
  },
  { immediate: true },
);
</script>
