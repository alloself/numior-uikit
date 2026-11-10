<template>
  <NuiCheckbox :model-value="all" :indeterminate="some" @update:model-value="toggleAll">
    Все регионы
  </NuiCheckbox>
  <NuiCheckboxGroup v-model:values="selected" :options="regions" class="ms-6" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiCheckbox, NuiCheckboxGroup, type NuiOption } from '@numior/vue';

const regions: NuiOption<string>[] = [
  { value: 'msk', label: 'Москва' },
  { value: 'spb', label: 'Санкт-Петербург' },
  { value: 'kzn', label: 'Казань' },
];

const selected = ref(['msk']);
const all = computed(() => selected.value.length === regions.length);
const some = computed(() => selected.value.length > 0 && !all.value);

const toggleAll = (checked: boolean): void => {
  selected.value = checked ? regions.map((region) => region.value) : [];
};
</script>
