<template>
  <NuiCheckbox :model-value="all" :indeterminate="some" @update:model-value="toggleAll">
    All regions
  </NuiCheckbox>
  <NuiCheckboxGroup v-model:values="selected" :options="regions" class="ms-6" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiCheckbox, NuiCheckboxGroup, type NuiOption } from '@numior/vue';

const regions: NuiOption<string>[] = [
  { value: 'lis', label: 'Lisbon' },
  { value: 'por', label: 'Porto' },
  { value: 'fun', label: 'Funchal' },
];

const selected = ref(['lis']);
const all = computed(() => selected.value.length === regions.length);
const some = computed(() => selected.value.length > 0 && !all.value);

const toggleAll = (checked: boolean): void => {
  selected.value = checked ? regions.map((region) => region.value) : [];
};
</script>
