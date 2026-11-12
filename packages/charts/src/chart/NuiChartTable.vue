<template>
  <div class="nui-chart__data" :class="{ 'nui-chart__data--shown': shown }">
    <table class="nui-chart__table">
      <caption class="nui-chart__caption">
        {{
          label
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ categoryTitle }}</th>
          <th v-for="series in spec.series" :key="series.id" scope="col">{{ series.name }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(category, index) in categories" :key="index">
          <th scope="row">{{ category }}</th>
          <td v-for="series in spec.series" :key="series.id">
            {{ valueText(series.values[index], locale) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { categoryTexts, valueText } from './chart-table';
import type { NuiChartTableProps } from './chart.types';

const { spec, label, locale, categoryName, categoryTitle, shown } =
  defineProps<NuiChartTableProps>();

const categories = computed(() => categoryTexts(spec, categoryName));
</script>
