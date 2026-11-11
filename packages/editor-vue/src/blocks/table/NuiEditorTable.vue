<template>
  <div class="nui-editor-table">
    <NuiContentTable
      v-model:widths="widths"
      v-model:column-order="order"
      :node="node"
      :editable="editable"
      :cell-selection="editable"
      :row-drag="editable"
      :column-menu="editable ? columnMenu : false"
      :context-menu="editable ? contextMenu : undefined"
      :commands="commands"
      @edit="onEdit"
      @reorder="onReorder"
      @change="onChange"
      @sort="(sort) => editor.run(sortTable(node.id, sort))"
      @filters="(filters) => editor.run(filterTable(node.id, filters))"
    />
    <div v-if="editable" class="nui-editor-table__actions">
      <NuiButton variant="ghost" size="sm" icon="plus" @click="addRow">
        {{ texts.tableAddRow }}
      </NuiButton>
      <NuiButton variant="ghost" size="sm" icon="plus" @click="addColumn(data.columns.length)">
        {{ texts.tableAddColumn }}
      </NuiButton>
    </div>
    <NuiPopover
      v-model:open="renaming"
      :anchor="rename?.anchor"
      placement="bottom-start"
      padding="sm"
      @toggle="onRenameToggle"
    >
      <form class="nui-editor-table__rename" @submit.prevent="renaming = false">
        <NuiInput
          ref="name"
          v-model="draft"
          size="sm"
          :aria-label="texts.tableColumnName"
          @keydown.escape="cancelled = true"
        />
      </form>
    </NuiPopover>
  </div>
</template>

<script setup lang="ts">
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  CircleChevronDown,
  Pencil,
  SquareCheck,
  Type,
} from '@lucide/vue';
import {
  CONTENT_TABLE_TYPES,
  contentTableData,
  type NuiContentCellValue,
  type NuiContentTableRow,
  type NuiContentTableType,
} from '@numior/content';
import { NuiContentTable } from '@numior/content/table';
import { redo, undo } from '@numior/editor-core';
import { PopoverState, useMessages, type IconSource } from '@numior/primitives';
import type {
  NuiTableCellValue,
  NuiTableColumnMenu,
  NuiTableColumnOrder,
  NuiTableCommandSink,
  NuiTableContextMenu,
  NuiTableEditEvent,
  NuiTableReorderEvent,
  NuiTableWidths,
} from '@numior/table';
import { NuiButton, NuiInput, NuiPopover } from '@numior/vue';
import { watchDebounced } from '@vueuse/core';
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue';
import type { NuiEditorBlockViewProps } from '../block.types';
import {
  deleteTableColumn,
  deleteTableRows,
  filterTable,
  insertTableColumn,
  insertTableRows,
  moveTableRow,
  orderTableColumns,
  renameTableColumn,
  resizeTableColumns,
  retypeTableColumn,
  setTableCells,
  sortTable,
} from './table-commands';
import { editorMessages } from '../../editor/editor.messages';

interface Renaming {
  readonly column: string;
  readonly anchor: HTMLElement;
}

const { node, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);
const nameInput = useTemplateRef<InstanceType<typeof NuiInput>>('name');

const widths = ref<NuiTableWidths>({});
const order = ref<NuiTableColumnOrder>([]);
const renaming = ref(false);
const rename = shallowRef<Renaming>();
const draft = ref('');
const cancelled = ref(false);

const data = computed(() => contentTableData(node));

const TYPE_ICONS: Readonly<Record<NuiContentTableType, IconSource>> = {
  text: Type,
  number: 'hash',
  date: 'calendar',
  boolean: SquareCheck,
  select: CircleChevronDown,
};

const isType = (value: string): value is NuiContentTableType =>
  CONTENT_TABLE_TYPES.some((type) => type === value);

const cellOf = (value: NuiTableCellValue): string | number | boolean | null =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value;

const indexOf = (key: string): number =>
  data.value.columns.findIndex((column) => column.id === key);

const rowIndex = (row: NuiContentTableRow): number =>
  data.value.rows.findIndex((candidate) => candidate.id === row.id);

const addRow = (): void => {
  editor.run(insertTableRows(node.id, data.value.rows.length));
};

const addColumn = (at: number): void => {
  editor.run(insertTableColumn(node.id, at, texts.value.tableColumn({ index: at + 1 })));
};

const startRename = (column: string, anchor: HTMLElement): void => {
  rename.value = { column, anchor };
  draft.value = data.value.columns[indexOf(column)]?.name ?? '';
  cancelled.value = false;
  renaming.value = true;
};

const onRenameToggle = (event: Event): void => {
  const current = rename.value;

  if ('newState' in event && event.newState === PopoverState.Open) {
    nameInput.value?.focus();
    return;
  }
  if (current !== undefined && !cancelled.value) {
    editor.run(renameTableColumn(node.id, current.column, draft.value.trim()));
  }
  rename.value = undefined;
};

const columnMenu: NuiTableColumnMenu<NuiContentTableRow> = ({ column, anchor }) => {
  const index = indexOf(column.key);
  const type = data.value.columns[index]?.type ?? 'text';

  return [
    {
      key: 'rename',
      label: texts.value.tableRename,
      icon: Pencil,
      onSelect: () => startRename(column.key, anchor),
    },
    {
      type: 'sub',
      key: 'type',
      label: texts.value.tableType,
      icon: TYPE_ICONS[type],
      items: [
        {
          type: 'radio-group',
          key: 'types',
          value: type,
          onChange: (value) => {
            if (!isType(value)) {
              return;
            }

            editor.run(retypeTableColumn(node.id, column.key, value));
          },
          items: CONTENT_TABLE_TYPES.map((option) => ({
            value: option,
            label: texts.value.tableTypeName({ type: option }),
          })),
        },
      ],
    },
    {
      key: 'before',
      label: texts.value.tableColumnBefore,
      icon: BetweenVerticalStart,
      onSelect: () => addColumn(index),
    },
    {
      key: 'after',
      label: texts.value.tableColumnAfter,
      icon: BetweenVerticalEnd,
      onSelect: () => addColumn(index + 1),
    },
    {
      key: 'delete',
      label: texts.value.tableDeleteColumn,
      icon: 'trash',
      disabled: data.value.columns.length < 2,
      onSelect: () => editor.run(deleteTableColumn(node.id, column.key)),
    },
  ];
};

const contextMenu: NuiTableContextMenu<NuiContentTableRow> = ({ row }) => [
  {
    key: 'above',
    label: texts.value.tableRowAbove,
    icon: BetweenHorizontalStart,
    onSelect: () => editor.run(insertTableRows(node.id, rowIndex(row))),
  },
  {
    key: 'below',
    label: texts.value.tableRowBelow,
    icon: BetweenHorizontalEnd,
    onSelect: () => editor.run(insertTableRows(node.id, rowIndex(row) + 1)),
  },
  {
    key: 'delete-row',
    label: texts.value.tableDeleteRow,
    icon: 'trash',
    onSelect: () => editor.run(deleteTableRows(node.id, [row.id])),
  },
];

const commands: NuiTableCommandSink<NuiContentTableRow> = {
  push: () => undefined,
  undo: () => (editor.run(undo) ? 1 : 0),
  redo: () => (editor.run(redo) ? 1 : 0),
};

const onEdit = (event: NuiTableEditEvent<NuiContentTableRow>): void => {
  editor.run(
    setTableCells(
      node.id,
      event.changes.map((change) => ({
        row: change.row.id,
        column: change.key,
        value: cellOf(change.value),
      })),
    ),
  );
};

const onChange = (row: NuiContentTableRow, column: string, value: NuiContentCellValue): void => {
  editor.run(setTableCells(node.id, [{ row: row.id, column, value }]));
};

const onReorder = (event: NuiTableReorderEvent<NuiContentTableRow>): void => {
  editor.run(moveTableRow(node.id, event.row.id, event.to));
};

watchDebounced(
  widths,
  (value) => {
    if (Object.keys(value).length === 0) {
      return;
    }

    editor.run(resizeTableColumns(node.id, value));
    widths.value = {};
  },
  { debounce: 400 },
);

watch(order, (value) => {
  if (value.length === 0) {
    return;
  }

  editor.run(orderTableColumns(node.id, value));
  order.value = [];
});
</script>
