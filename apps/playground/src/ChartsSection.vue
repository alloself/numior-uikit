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
      <NuiChart
        :spec="visits"
        label="Посещения за две недели, тыс."
        :show-table="showTable"
        data-testid="chart-lines"
      />
      <NuiChart
        :spec="income"
        label="Выручка по каналам за полгода, млн ₽"
        :show-table="showTable"
        data-testid="chart-areas"
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

const DAY = 86_400_000;

const FIRST_DAY = Date.UTC(2026, 9, 5);

const days = Array.from({ length: 14 }, (_unused, index) => FIRST_DAY + index * DAY);

const visits: ChartSpec = {
  kind: 'line',
  categories: { kind: 'time', values: days },
  series: [
    {
      id: 'site',
      name: 'Сайт',
      values: [42, 45, 44, 51, 56, 38, 35, 47, 52, 55, 58, 61, 43, 40],
    },
    {
      id: 'app',
      name: 'Приложение',
      values: [28, 30, 33, null, null, 41, 44, 36, 37, 39, 42, 45, 52, 55],
    },
  ],
};

const income: ChartSpec = {
  kind: 'area',
  stacking: 'stacked',
  categories: { kind: 'text', labels: ['Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь'] },
  series: [
    { id: 'online', name: 'Онлайн', values: [14, 16, 19, 18, 22, 26] },
    { id: 'stores', name: 'Магазины', values: [21, 20, 22, 24, 23, 25] },
    { id: 'partners', name: 'Партнёры', values: [6, 8, 7, 9, 11, 10] },
  ],
  valueAxis: { title: 'млн ₽' },
};
</script>
