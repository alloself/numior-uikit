<template>
  <NuiTable
    :columns="columns"
    :rows="regions"
    :get-key="keyOf"
    :column-menu="false"
    gridlines
    caption="Продажи по кварталам, млн ₽"
  >
    <template #overlay="{ rectOf }">
      <div
        v-for="box in boxesOf(rectOf)"
        :key="box.key"
        class="absolute box-border rounded-sm border-2"
        :style="box.style"
      ></div>
    </template>
  </NuiTable>
</template>

<script setup lang="ts">
import {
  NuiTable,
  type NuiTableColumn,
  type NuiTableRange,
  type NuiTableRect,
} from '@numior/table';

interface Region {
  readonly name: string;
  readonly quarters: readonly number[];
}

interface Mark {
  readonly range: NuiTableRange;
  readonly tone: string;
}

const regions: Region[] = [
  { name: 'Север', quarters: [120, 135, 150, 170] },
  { name: 'Юг', quarters: [90, 95, 110, 105] },
  { name: 'Запад', quarters: [140, 150, 145, 160] },
  { name: 'Восток', quarters: [70, 85, 90, 100] },
  { name: 'Итого', quarters: [420, 465, 495, 535] },
];

const QUARTERS = ['I кв.', 'II кв.', 'III кв.', 'IV кв.'];

const columns: NuiTableColumn<Region>[] = [
  {
    key: 'name',
    label: 'Регион',
    type: 'text',
    width: 160,
    sortable: false,
    filter: false,
    value: (row) => row.name,
  },
  ...QUARTERS.map((label, index): NuiTableColumn<Region> => ({
    key: `q${index + 1}`,
    label,
    type: 'number',
    width: 110,
    sortable: false,
    filter: false,
    value: (row) => row.quarters[index] ?? null,
  })),
];

const MARKS: readonly Mark[] = [
  { range: { from: { row: 0, col: 1 }, to: { row: 2, col: 2 } }, tone: 'var(--color-primary)' },
  { range: { from: { row: 4, col: 1 }, to: { row: 4, col: 4 } }, tone: 'var(--color-success)' },
];

const boxesOf = (rectOf: (range: NuiTableRange) => NuiTableRect | undefined) =>
  MARKS.flatMap((mark) => {
    const rect = rectOf(mark.range);

    return rect === undefined
      ? []
      : [
          {
            key: mark.tone,
            style: {
              insetBlockStart: `${rect.top}px`,
              insetInlineStart: `${rect.start}px`,
              inlineSize: `${rect.width}px`,
              blockSize: `${rect.height}px`,
              borderColor: mark.tone,
              background: `color-mix(in oklab, ${mark.tone} 10%, transparent)`,
            },
          },
        ];
  });

const keyOf = (region: Region): string => region.name;
</script>
