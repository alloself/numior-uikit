<template>
  <NuiCombobox
    v-model="employee"
    :options="found"
    :filter="false"
    :loading="loading"
    label="Employee"
    placeholder="Name or team"
    @search="search"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOption } from '@numior/vue';

const directory: NuiOption<string>[] = [
  { value: 'titova', label: 'Anna Titova', description: 'Design' },
  { value: 'belov', label: 'Igor Belov', description: 'Engineering' },
  { value: 'kim', label: 'Maria Kim', description: 'Support' },
  { value: 'smirnov', label: 'Oleg Smirnov', description: 'Engineering' },
];

const employee = ref<string | null>(null);
const found = ref(directory);
const loading = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

const matches = (option: NuiOption<string>, query: string): boolean =>
  `${option.label} ${option.description ?? ''}`.toLowerCase().includes(query.toLowerCase());

const search = (query: string): void => {
  clearTimeout(timer);
  loading.value = true;

  timer = setTimeout(() => {
    found.value = directory.filter((option) => matches(option, query));
    loading.value = false;
  }, 400);
};
</script>
