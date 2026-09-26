<template>
  <section class="panel" aria-labelledby="pickers-title">
    <div class="section-heading">
      <h2 id="pickers-title">Выбор</h2>
      <span class="tag">NuiSelect · NuiCombobox · NuiPagination</span>
    </div>
    <div class="form">
      <NuiField label="Страна" description="Одиночный выбор с очисткой">
        <NuiSelect
          v-model="country"
          :options="countries"
          placeholder="Выберите страну"
          clearable
          data-testid="pick-select"
        />
      </NuiField>
      <NuiField label="Теги" description="Несколько значений">
        <NuiSelect
          v-model="tags"
          :options="tagOptions"
          multiple
          placeholder="Выберите теги"
          data-testid="pick-multi"
        />
      </NuiField>
      <NuiField label="Город" description="Поиск с загрузкой">
        <NuiCombobox
          v-model="city"
          :options="cityOptions"
          :filter="false"
          :loading="cityLoading"
          placeholder="Начните вводить"
          toggle-label="Показать города"
          clearable
          data-testid="pick-combobox"
          @search="searchCities"
        />
      </NuiField>
      <NuiField label="Ключевые слова" description="Чипы и свои значения">
        <NuiCombobox
          v-model="keywords"
          :options="keywordOptions"
          multiple
          :custom-value="(text) => text"
          placeholder="Добавить"
          empty-label="Enter добавит новое"
          data-testid="pick-keywords"
        />
      </NuiField>
    </div>
    <NuiPagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="240"
      :page-sizes="[10, 20, 50]"
      data-testid="pick-pagination"
    />
    <NuiPagination
      :page="linkPage"
      :total="60"
      :show-range="false"
      :href="(target) => `#page-${target}`"
      label="Страницы по ссылкам"
      data-testid="pick-pagination-links"
      @update:page="linkPage = $event"
    />
    <pre class="output" data-testid="pickers-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiCombobox,
  NuiField,
  NuiPagination,
  NuiSelect,
  type NuiOption,
  type NuiOptionSource,
} from '@numior/vue';

const countries: NuiOptionSource<string> = [
  {
    label: 'Европа',
    items: [
      { value: 'at', label: 'Австрия' },
      { value: 'be', label: 'Бельгия' },
      { value: 'de', label: 'Германия' },
      { value: 'dk', label: 'Дания', disabled: true },
    ],
  },
  {
    label: 'Азия',
    items: [
      { value: 'vn', label: 'Вьетнам' },
      { value: 'jp', label: 'Япония' },
    ],
  },
];

const tagOptions: NuiOption<string>[] = [
  { value: 'frontend', label: 'Фронтенд' },
  { value: 'backend', label: 'Бэкенд' },
  { value: 'design', label: 'Дизайн' },
  { value: 'qa', label: 'Тесты' },
];

const cities: NuiOption<string>[] = [
  { value: 'kazan', label: 'Казань' },
  { value: 'kaluga', label: 'Калуга' },
  { value: 'moscow', label: 'Москва' },
  { value: 'murmansk', label: 'Мурманск' },
  { value: 'samara', label: 'Самара' },
  { value: 'sochi', label: 'Сочи' },
];

const keywordOptions: NuiOption<string>[] = [
  { value: 'vue', label: 'Vue' },
  { value: 'vite', label: 'Vite' },
  { value: 'vitest', label: 'Vitest' },
  { value: 'playwright', label: 'Playwright' },
];

const country = ref<string>();
const tags = ref<string[]>(['frontend']);
const city = ref<string>();
const cityOptions = ref<NuiOption<string>[]>(cities);
const cityLoading = ref(false);
const keywords = ref<string[]>([]);
const page = ref(1);
const pageSize = ref(20);
const linkPage = ref(2);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const searchCities = (query: string): void => {
  cityLoading.value = true;
  if (searchTimer !== undefined) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(() => {
    const needle = query.trim().toLowerCase();
    cityOptions.value = cities.filter((option) => option.label.toLowerCase().includes(needle));
    cityLoading.value = false;
  }, 300);
};

const output = computed(() =>
  JSON.stringify(
    {
      country: country.value ?? null,
      tags: tags.value,
      city: city.value ?? null,
      cityLoading: cityLoading.value,
      keywords: keywords.value,
      page: page.value,
      pageSize: pageSize.value,
      linkPage: linkPage.value,
    },
    null,
    2,
  ),
);
</script>
