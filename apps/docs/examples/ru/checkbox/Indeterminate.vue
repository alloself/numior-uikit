<template>
  <div class="flex flex-col gap-2">
    <NuiCheckbox :model-value="all" :indeterminate="some" @update:model-value="toggleAll">
      Все категории
    </NuiCheckbox>
    <NuiCheckboxGroup v-model:values="selected" :options="options" class="ms-6" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiCheckbox, NuiCheckboxGroup } from '@numior/kit';
import { categories } from '#demo/products';

const options = categories.map(({ value, label }) => ({ value, label }));

const selected = ref(['furniture']);
const all = computed(() => selected.value.length === options.length);
const some = computed(() => selected.value.length > 0 && !all.value);

const toggleAll = (checked: boolean): void => {
  selected.value = checked ? options.map((option) => option.value) : [];
};
</script>
