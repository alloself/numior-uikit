<template>
  <div class="flex flex-col gap-4">
    <NuiSelect v-model="locale" :options="locales" label="Локаль приложения" class="max-w-sm" />
    <NuiPagination v-model:page="page" :total="240" show-range />
    <NuiDatePicker v-model="date" label="Дата отчёта" today="2026-09-28" class="max-w-sm" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { provideNuiConfig } from '@numior/primitives';
import { NuiDatePicker, NuiPagination, NuiSelect, type NuiOption } from '@numior/vue';

const locale = ref('ru-RU');
const page = ref(3);
const date = ref<string | null>('2026-09-28');

const locales: readonly NuiOption<string>[] = [
  { value: 'ru-RU', label: 'Русский (ru-RU)' },
  { value: 'en-US', label: 'English (en-US)' },
  { value: 'en-GB', label: 'English (en-GB)' },
];

provideNuiConfig({ locale: () => locale.value });
</script>
