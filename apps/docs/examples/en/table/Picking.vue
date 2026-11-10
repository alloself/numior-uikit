<template>
  <NuiTable
    v-model:draft="draft"
    v-bind="sheet"
    :picking="picking"
    :column-menu="false"
    :caption="CAPTION"
    bordered
    size="sm"
    @pick="onPick"
    @edit="onEdit"
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
import { ref, shallowRef } from 'vue';
import {
  NuiTable,
  cellName,
  columnIndex,
  rangeName,
  tableCells,
  type NuiTableCells,
  type NuiTableDraft,
  type NuiTableEditEvent,
  type NuiTableRange,
  type NuiTableRect,
} from '@numior/table';

interface LastPick {
  readonly name: string;
  readonly at: number;
}

const CAPTION = 'Budget, thousands: start a formula with =';
const OPERATOR = /[=(+\-*/,;:]$/;
const REFERENCE = /([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/g;
const TONES = ['var(--nui-primary)', 'var(--nui-success)', 'var(--nui-warning)'];

const START: readonly (readonly string[])[] = [
  ['Item', 'Jan', 'Feb', 'Mar'],
  ['Sales', '820', '857', '894'],
  ['Services', '310', '301', '292'],
  ['Subscriptions', '140', '162', '184'],
  ['Total', '', '', ''],
];

const texts = shallowRef<ReadonlyMap<string, string>>(
  new Map(
    START.flatMap((cells, row) =>
      cells.map((text, col) => [cellName({ row, col }), text] as const),
    ),
  ),
);

const source = tableCells({
  rows: 6,
  cols: 4,
  cellAt: (row, col) => ({ text: texts.value.get(cellName({ row, col })) ?? '' }),
  columnWidth: (col) => (col === 0 ? 140 : 96),
});

const sheet: NuiTableCells = {
  ...source,
  columns: source.columns.map((column) => ({ ...column, editable: true })),
};

const draft = ref<NuiTableDraft>();
const last = shallowRef<LastPick>();

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const keptLength = (text: string): number => {
  const pick = last.value;

  return pick !== undefined && text.slice(pick.at) === pick.name ? pick.at : text.length;
};

const picking = (next: NuiTableDraft): boolean => {
  const text = textOf(next.value);

  return text.startsWith('=') && (OPERATOR.test(text) || keptLength(text) < text.length);
};

const onPick = (range: NuiTableRange): void => {
  if (draft.value === undefined) {
    return;
  }
  const text = textOf(draft.value.value);
  const kept = text.slice(0, keptLength(text));
  const name = rangeName(range);

  last.value = { name, at: kept.length };
  draft.value = { ...draft.value, value: kept + name };
};

const onEdit = (event: NuiTableEditEvent<number>): void => {
  const next = new Map(texts.value);

  for (const { row, key, value } of event.changes) {
    next.set(`${key}${row + 1}`, textOf(value));
  }
  texts.value = next;
};

const cellOf = (letters = 'A', digits = '1') => ({
  row: Number(digits) - 1,
  col: columnIndex(letters) ?? 0,
});

const boxesOf = (rectOf: (range: NuiTableRange) => NuiTableRect | undefined) => {
  const text = textOf(draft.value?.value);
  const found = text.startsWith('=') ? [...text.matchAll(REFERENCE)] : [];

  return found.flatMap((match, index) => {
    const from = cellOf(match[1], match[2]);
    const rect = rectOf({ from, to: match[3] === undefined ? from : cellOf(match[3], match[4]) });
    const tone = TONES[index % TONES.length] ?? 'var(--nui-primary)';

    return rect === undefined
      ? []
      : [
          {
            key: index,
            style: {
              insetBlockStart: `${rect.top}px`,
              insetInlineStart: `${rect.start}px`,
              inlineSize: `${rect.width}px`,
              blockSize: `${rect.height}px`,
              borderColor: tone,
              background: `color-mix(in oklab, ${tone} 10%, transparent)`,
            },
          },
        ];
  });
};
</script>
