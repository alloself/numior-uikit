<template>
  <div class="nui-flex nui-flex-col nui-gap-4">
    <NuiSelect
      v-model="locale"
      :options="locales"
      label="Application locale"
      class="nui-max-w-sm"
    />
    <NuiPagination v-model:page="page" :total="240" show-range />
    <NuiDatePicker v-model="date" label="Report date" today="2026-09-28" class="nui-max-w-sm" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiDatePicker,
  NuiPagination,
  NuiSelect,
  provideNuiConfig,
  type NuiOption,
} from '@numior/vue';

const locale = ref('en-US');
const page = ref(3);
const date = ref<string | null>('2026-09-28');

const locales: readonly NuiOption<string>[] = [
  { value: 'en-US', label: 'English (en-US)' },
  { value: 'ru-RU', label: 'Русский (ru-RU)' },
  { value: 'en-GB', label: 'English (en-GB)' },
];

provideNuiConfig({ locale: () => locale.value });
</script>
