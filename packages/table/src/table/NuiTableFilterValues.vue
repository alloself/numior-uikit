<template>
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
  <p v-else-if="waiting" class="nui-table-filter__note" role="status">
    {{ texts.loading }}
  </p>
  <template v-else>
    <NuiCheckbox
      :model-value="allChosen"
      :indeterminate="someChosen"
      size="sm"
      @update:model-value="emit('chooseAll', $event)"
    >
      {{ texts.selectAll }}
    </NuiCheckbox>
    <div
      class="nui-table-filter__values"
      role="group"
      :aria-label="title"
      :aria-busy="loading || undefined"
    >
      <NuiCheckbox
        v-for="option in options"
        :key="option.key"
        :model-value="chosen(option.value)"
        size="sm"
        @update:model-value="emit('toggle', option.value)"
      >
        {{ option.label }}
      </NuiCheckbox>
    </div>
  </template>
  <p v-if="truncated" class="nui-table-filter__note">{{ texts.truncated }}</p>
</template>

<script setup lang="ts">
import { NuiCheckbox, NuiInput } from '@numior/vue';
import type { TableFilterValue } from '../engine';
import type { NuiTableFilterValuesProps } from './table.types';

const {
  title,
  options,
  texts,
  searchable,
  nothingFound,
  waiting,
  loading,
  truncated,
  allChosen,
  someChosen,
  chosen,
} = defineProps<NuiTableFilterValuesProps>();

const query = defineModel<string>('query', { required: true });

const emit = defineEmits<{
  chooseAll: [checked: boolean];
  toggle: [value: TableFilterValue];
}>();
</script>
