<template>
  <NuiTable
    :columns="columns"
    :rows="plans"
    :get-key="keyOf"
    :frozen-rows="1"
    :cell-style="styleOf"
    :column-menu="false"
    height="17rem"
    caption="Ваш тариф и варианты перехода"
  />
</template>

<script setup lang="ts">
import {
  NuiTable,
  type NuiTableCellRef,
  type NuiTableCellStyle,
  type NuiTableColumn,
} from '@numior/kit/table';

interface Plan {
  readonly name: string;
  readonly cores: number;
  readonly memory: number;
  readonly disk: number;
  readonly price: number;
}

const plans: Plan[] = [
  { name: 'Ваш тариф', cores: 2, memory: 4, disk: 60, price: 890 },
  { name: 'Мини', cores: 1, memory: 1, disk: 20, price: 290 },
  { name: 'Старт', cores: 1, memory: 2, disk: 30, price: 390 },
  { name: 'Блог', cores: 2, memory: 2, disk: 40, price: 590 },
  { name: 'Сайт', cores: 2, memory: 4, disk: 80, price: 790 },
  { name: 'Магазин', cores: 2, memory: 8, disk: 80, price: 1190 },
  { name: 'Команда', cores: 4, memory: 8, disk: 120, price: 1590 },
  { name: 'Студия', cores: 4, memory: 16, disk: 160, price: 2390 },
  { name: 'Агентство', cores: 6, memory: 16, disk: 240, price: 2990 },
  { name: 'Бизнес', cores: 8, memory: 32, disk: 320, price: 4790 },
  { name: 'Корпорация', cores: 12, memory: 48, disk: 480, price: 7190 },
  { name: 'Кластер', cores: 16, memory: 64, disk: 640, price: 9590 },
];

const columns: NuiTableColumn<Plan>[] = [
  {
    key: 'name',
    label: 'Тариф',
    type: 'text',
    width: 170,
    sortable: false,
    filter: false,
    value: (row) => row.name,
  },
  {
    key: 'cores',
    label: 'Ядра',
    type: 'number',
    width: 90,
    sortable: false,
    filter: false,
    value: (row) => row.cores,
  },
  {
    key: 'memory',
    label: 'Память, ГБ',
    type: 'number',
    width: 120,
    sortable: false,
    filter: false,
    value: (row) => row.memory,
  },
  {
    key: 'disk',
    label: 'Диск, ГБ',
    type: 'number',
    width: 110,
    sortable: false,
    filter: false,
    value: (row) => row.disk,
  },
  {
    key: 'price',
    label: '₽ в месяц',
    type: 'number',
    width: 120,
    flex: 1,
    sortable: false,
    filter: false,
    value: (row) => row.price,
  },
];

const CURRENT: NuiTableCellStyle = {
  style: { 'font-weight': 'var(--nui-font-weight-semibold)' },
};

const styleOf = ({ position }: NuiTableCellRef<Plan>): NuiTableCellStyle | undefined =>
  position === 0 ? CURRENT : undefined;

const keyOf = (plan: Plan): string => plan.name;
</script>
