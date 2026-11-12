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
        <NuiInput
          v-if="searchable"
          v-model="query"
          type="search"
          :label="texts.search"
          size="sm"
          autocomplete="off"
          spellcheck="false"
        />
        <p v-if="nothingFound" class="nui-table-filter__note">{{ texts.noMatches }}</p>
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
        </template>
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
  FLOATING_OFFSET,
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
import {
  chosenIn,
  draftOf,
  filterFromDraft,
  valuesToggled,
  valuesWith,
  type FilterDraft,
  type SetFilterDraft,
} from './table-filter';
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

const SEARCH_FROM = 8;

const { title, kind, columnKey, filter, anchor, locale, loadValues, valueLabel } =
  defineProps<NuiTableFilterProps>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{ apply: [filter: NuiTableColumnFilter | null] }>();

const content = useTemplateRef<HTMLElement>('content');
const messages = useMessages(tableMessages, () => locale);
const draft = ref<FilterDraft>(draftOf(kind, filter));
const values = shallowRef<readonly TableFilterValue[]>([]);
const truncated = ref(false);
const query = ref('');
const searchable = ref(false);
const blankListed = ref(false);
let asking: AbortController | undefined;

const { contentAttrs } = usePopover(content, { open, mode: PopoverMode.Auto });

useFloating(() => anchor, content, {
  placement: 'bottom-start',
  offset: FLOATING_OFFSET,
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
  search: messages.value.filterSearch,
  noMatches: messages.value.filterNoMatches,
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

const needle = computed(() => query.value.trim());

const options = computed<readonly ValueOption[]>(() =>
  values.value.map((value) => ({
    key: `${typeof value}:${String(value)}`,
    value,
    label: valueLabel(value),
  })),
);

const setDraft = computed<SetFilterDraft | undefined>(() =>
  draft.value.kind === NuiTableFilterKind.Set ? draft.value : undefined,
);

const chosen = (value: TableFilterValue): boolean =>
  setDraft.value !== undefined && chosenIn(setDraft.value, value);

const everyListed = computed(
  () => options.value.length > 0 && options.value.every((option) => chosen(option.value)),
);

const someListed = computed(() => options.value.some((option) => chosen(option.value)));

const whole = computed(() => needle.value === '' && !truncated.value);

const nothingKept = computed(
  () => setDraft.value?.exclude === true && setDraft.value.values.length === 0,
);

const everyChosen = computed(() => nothingKept.value || (whole.value && everyListed.value));

const allChosen = computed(() => (needle.value === '' ? everyChosen.value : everyListed.value));

const someChosen = computed(() => {
  if (allChosen.value) {
    return false;
  }
  return needle.value === ''
    ? setDraft.value?.exclude === true || (setDraft.value?.values.length ?? 0) > 0
    : someListed.value;
});

const nothingFound = computed(() => needle.value !== '' && options.value.length === 0);

const toggle = (value: TableFilterValue): void => {
  const current = setDraft.value;

  if (current === undefined) {
    return;
  }

  current.values = valuesToggled(current, value);
};

const chooseAll = (checked: boolean): void => {
  const current = setDraft.value;

  if (current === undefined) {
    return;
  }
  if (needle.value === '') {
    current.exclude = checked;
    current.values = [];
    return;
  }

  current.values = valuesWith(current, values.value, checked);
};

const withBlank = (
  found: readonly TableFilterValue[],
  search: string,
): readonly TableFilterValue[] =>
  blankListed.value &&
  !found.includes(null) &&
  valueLabel(null).toLowerCase().includes(search.toLowerCase())
    ? [...found, null]
    : found;

const load = async (search: string): Promise<void> => {
  const controller = new AbortController();

  asking?.abort();
  asking = controller;

  const result = await loadValues(search, controller.signal);

  if (result === null || controller.signal.aborted) {
    return;
  }
  if (search === '') {
    blankListed.value = result.values.includes(null);
    searchable.value = result.truncated || result.values.length > SEARCH_FROM;
  }

  values.value = search === '' ? result.values : withBlank(result.values, search);
  truncated.value = result.truncated;
};

const close = (next: NuiTableColumnFilter | null): void => {
  emit('apply', next);
  open.value = false;
};

const noneChosen = computed(() => whole.value && options.value.length > 0 && !someListed.value);

const unfiltered = (): boolean => everyChosen.value || noneChosen.value;

const apply = (): void => {
  close(unfiltered() ? null : filterFromDraft(columnKey, draft.value));
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
    if (!isOpen) {
      return;
    }

    draft.value = draftOf(kind, filter);
    query.value = '';

    if (kind !== NuiTableFilterKind.Set) {
      return;
    }

    void load('');
  },
  { immediate: true },
);

watch(needle, (search) => {
  if (!open.value) {
    return;
  }

  void load(search);
});
</script>
