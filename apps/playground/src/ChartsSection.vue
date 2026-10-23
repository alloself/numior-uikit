<template>
  <section class="panel" aria-labelledby="charts-title">
    <div class="section-heading">
      <h2 id="charts-title">Графики</h2>
      <span class="tag">NuiChart · @numior/charts</span>
    </div>
    <NuiSwitch v-model="showTable" label="Показать таблицу данных" data-testid="charts-table" />
    <div class="charts-grid">
      <NuiChart
        :spec="revenue"
        label="Выручка по кварталам, млн ₽"
        :show-table="showTable"
        data-testid="chart-columns"
      />
      <NuiChart
        :spec="channels"
        label="Доля каналов продаж по регионам"
        :height="260"
        :show-table="showTable"
        data-testid="chart-bars"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { NuiChart, type ChartSpec } from '@numior/charts';
import { NuiSwitch } from '@numior/vue';
import { ref } from 'vue';

const showTable = ref(false);

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: ['I кв.', 'II кв.', 'III кв.', 'IV кв.'] },
  series: [
    { id: 'online', name: 'Онлайн', values: [42, 51, 58, 73] },
    { id: 'stores', name: 'Магазины', values: [65, 61, 59, 66] },
    { id: 'partners', name: 'Партнёры', values: [18, 24, null, 31] },
  ],
  valueAxis: { title: 'млн ₽' },
  categoryAxis: { title: 'Квартал' },
};

const channels: ChartSpec = {
  kind: 'bar',
  stacking: 'percent',
  categories: { kind: 'text', labels: ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск'] },
  series: [
    { id: 'online', name: 'Онлайн', values: [48, 41, 33, 29] },
    { id: 'stores', name: 'Магазины', values: [37, 44, 52, 55] },
    { id: 'partners', name: 'Партнёры', values: [15, 15, 15, 16] },
  ],
};
</script>
