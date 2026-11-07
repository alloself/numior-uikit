<template>
  <form
    ref="root"
    class="nui-spreadsheet-pivot__editor"
    novalidate
    @submit.prevent="emit('apply', keptValues, order)"
  >
    <h3 class="nui-spreadsheet-pivot__subtitle">{{ name }}</h3>
    <NuiRadioGroup
      v-if="order !== undefined"
      :model-value="order"
      :options="sorts"
      :label="texts.sortOrder"
      @update:model-value="setOrder"
    />
    <NuiInput
      v-model="query"
      type="search"
      :label="texts.search"
      size="sm"
      autocomplete="off"
      spellcheck="false"
    />
    <div class="nui-spreadsheet-pivot__items" role="group" :aria-label="texts.items">
      <NuiCheckbox
        v-if="matches.length > 0"
        :model-value="allChecked"
        :indeterminate="someChecked"
        :label="texts.selectAll"
        @update:model-value="checkAll"
      />
      <NuiCheckbox
        v-for="item in matches"
        :key="item.key"
        :model-value="kept.has(item.key)"
        :label="item.label"
        @update:model-value="checkItem(item, $event)"
      />
      <p v-if="matches.length === 0" class="nui-spreadsheet-pivot__hint">{{ texts.noMatches }}</p>
    </div>
    <div class="nui-spreadsheet-pivot__footer">
      <NuiButton variant="ghost" tone="neutral" size="sm" @click="emit('cancel')">
        {{ texts.cancel }}
      </NuiButton>
      <NuiButton type="submit" size="sm" :disabled="kept.size === 0">{{ texts.apply }}</NuiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiCheckbox, NuiInput, NuiRadioGroup, type NuiOption } from '@numior/vue';
import { computed, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import { PivotSort, pivotKey, type CellValue } from '../../core';
import { spreadsheetPivotMessages } from './pivot-panel.messages';
import type { PivotItemView, SheetPivotItemsProps } from './pivot-panel.types';

const { name, items, shown, sort } = defineProps<SheetPivotItemsProps>();

const emit = defineEmits<{
  apply: [shown: readonly CellValue[], sort: PivotSort | undefined];
  cancel: [];
}>();

const root = useTemplateRef<HTMLFormElement>('root');

const texts = useMessages(spreadsheetPivotMessages);

const query = ref('');

const order = ref(sort);

const kept = shallowRef<ReadonlySet<string>>(new Set(shown.map(pivotKey)));

const sorts = computed((): NuiOption<PivotSort>[] => [
  { value: PivotSort.Ascending, label: texts.value.sortAscending },
  { value: PivotSort.Descending, label: texts.value.sortDescending },
  { value: PivotSort.Manual, label: texts.value.sortManual },
]);

const matches = computed((): readonly PivotItemView[] => {
  const needle = query.value.trim().toLocaleLowerCase();

  return needle === ''
    ? items
    : items.filter((item) => item.label.toLocaleLowerCase().includes(needle));
});

const checkedCount = computed(() =>
  matches.value.reduce((count, item) => (kept.value.has(item.key) ? count + 1 : count), 0),
);

const allChecked = computed(() => checkedCount.value === matches.value.length);

const someChecked = computed(() => checkedCount.value > 0 && !allChecked.value);

const keptValues = computed((): readonly CellValue[] =>
  items.reduce<CellValue[]>((values, item) => {
    if (kept.value.has(item.key)) {
      values.push(item.value);
    }
    return values;
  }, []),
);

const setOrder = (next: PivotSort | null): void => {
  if (next !== null) {
    order.value = next;
  }
};

const checkItem = (item: PivotItemView, on: boolean): void => {
  const next = new Set(kept.value);

  if (on) {
    next.add(item.key);
  } else {
    next.delete(item.key);
  }
  kept.value = next;
};

const checkAll = (on: boolean): void => {
  const next = new Set(kept.value);

  matches.value.forEach((item) => {
    if (on) {
      next.add(item.key);
    } else {
      next.delete(item.key);
    }
  });

  kept.value = next;
};

onMounted(() => {
  root.value?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
});
</script>
