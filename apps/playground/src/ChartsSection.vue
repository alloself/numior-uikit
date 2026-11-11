<template>
  <section class="panel" aria-labelledby="charts-title">
    <div class="section-heading">
      <h2 id="charts-title">Графики</h2>
      <span class="tag">NuiChart · @numior/charts</span>
    </div>
    <NuiSwitch v-model="showTable" label="Показать таблицу данных" data-testid="charts-table" />
    <div class="charts-grid">
      <div class="charts-cell">
        <NuiChart
          v-model:selected="quarter"
          :spec="revenue"
          label="Выручка по кварталам, млн ₽"
          :show-table="showTable"
          data-testid="chart-columns"
        />
        <p class="charts-note" data-testid="charts-selected">{{ selectedText }}</p>
      </div>
      <NuiChart
        :spec="channels"
        label="Доля каналов продаж по регионам"
        :height="260"
        :show-table="showTable"
        data-testid="chart-bars"
      />
      <div class="charts-cell">
        <NuiChart
          :spec="visitsSpec"
          label="Посещения за две недели, тыс."
          :show-table="showTable"
          data-testid="chart-lines"
        />
        <p class="charts-note" data-testid="charts-gap-note">Нет данных за 8–9 октября</p>
        <NuiSwitch v-model="connectGaps" label="Соединять пропуски" data-testid="charts-gaps" />
      </div>
      <NuiChart
        :spec="income"
        label="Выручка по каналам за полгода, млн ₽"
        :show-table="showTable"
        data-testid="chart-areas"
      />
      <NuiChart
        :spec="share"
        label="Доля каналов в выручке за год"
        :height="260"
        :show-table="showTable"
        data-testid="chart-pie"
      />
      <NuiChart
        :spec="costs"
        label="Структура расходов за год"
        :height="260"
        :show-table="showTable"
        data-testid="chart-doughnut"
      />
      <NuiChart
        :spec="discounts"
        label="Скидка и прирост продаж по акциям"
        :show-table="showTable"
        data-testid="chart-scatter"
      />
      <NuiChart
        :spec="latency"
        label="Время ответа сервиса за неделю, мс: ось от 100 до 400"
        :show-table="showTable"
        data-testid="chart-bounded"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { NuiChart, type ChartHit, type ChartSpec } from '@numior/charts';
import { NuiSwitch } from '@numior/vue';
import { computed, ref } from 'vue';

const showTable = ref(false);
const quarter = ref<ChartHit | null>(null);

const QUARTERS = ['I кв.', 'II кв.', 'III кв.', 'IV кв.'];

const selectedText = computed(() =>
  quarter.value === null
    ? 'Щёлкните по кварталу, чтобы выбрать его'
    : `Выбран квартал: ${QUARTERS[quarter.value.index] ?? ''}`,
);

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: QUARTERS },
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

const connectGaps = ref(false);

const visitsSpec = computed<ChartSpec>(() => ({
  ...visits,
  gaps: connectGaps.value ? 'connect' : 'break',
}));

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

const share: ChartSpec = {
  kind: 'pie',
  categories: { kind: 'text', labels: ['Онлайн', 'Магазины', 'Партнёры', 'Опт'] },
  series: [{ id: 'revenue', name: 'Выручка, млн ₽', values: [224, 251, 73, 41] }],
};

const costs: ChartSpec = {
  kind: 'doughnut',
  categories: { kind: 'text', labels: ['Зарплаты', 'Аренда', 'Маркетинг', 'Логистика', 'Прочее'] },
  series: [{ id: 'fact', name: 'Расходы, млн ₽', values: [48, 17, 14, 12, 9] }],
};

const discounts: ChartSpec = {
  kind: 'scatter',
  categories: { kind: 'number', values: [5, 7, 10, 12, 15, 18, 20, 25, 30, 35] },
  series: [
    { id: 'online', name: 'Онлайн', values: [3, 6, 8, 7, 12, 15, 14, 19, 21, 22] },
    { id: 'stores', name: 'Магазины', values: [2, 2, 5, 6, 6, 9, 11, 10, 12, 16] },
  ],
  valueAxis: { title: 'Прирост, %' },
  categoryAxis: { title: 'Скидка, %' },
};

const latency: ChartSpec = {
  kind: 'line',
  categories: { kind: 'text', labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] },
  series: [{ id: 'p95', name: 'p95', values: [180, 210, 195, 1240, 230, 170, 160] }],
  valueAxis: { title: 'мс', min: 100, max: 400 },
};
</script>
