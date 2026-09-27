<template>
  <NuiCombobox
    v-model="employee"
    :options="found"
    :filter="false"
    :loading="loading"
    label="Сотрудник"
    placeholder="Фамилия или отдел"
    @search="search"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOption } from '@numior/vue';

const directory: NuiOption<string>[] = [
  { value: 'titova', label: 'Анна Титова', description: 'Дизайн' },
  { value: 'belov', label: 'Игорь Белов', description: 'Разработка' },
  { value: 'kim', label: 'Мария Ким', description: 'Поддержка' },
  { value: 'smirnov', label: 'Олег Смирнов', description: 'Разработка' },
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
