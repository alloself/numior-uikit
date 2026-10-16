import { defineAsyncComponent } from 'vue';
import { leaveClosedToggle, toggleTodo } from './block-commands';
import type { NuiEditorBlock } from './block.types';
import { calloutToneOf, toneEntries } from './callout/callout-tones';
import NuiEditorCalloutTone from './callout/NuiEditorCalloutTone.vue';
import { COLUMN_COUNTS, insertColumns } from './columns/columns';
import NuiEditorColumnsResize from './columns/NuiEditorColumnsResize.vue';
import { defineBlock } from './define-block';
import { insertTable } from './table/table-commands';
import NuiEditorTodoCheck from './todo/NuiEditorTodoCheck.vue';
import NuiEditorToggleButton from './toggle/NuiEditorToggleButton.vue';

export const todoBlock = defineBlock({
  name: 'todo_item',
  view: NuiEditorTodoCheck,
  keymap: { 'Mod-Enter': toggleTodo },
});

export const toggleBlock = defineBlock({
  name: 'toggle',
  view: NuiEditorToggleButton,
  keymap: (editor) => ({ Enter: leaveClosedToggle(editor) }),
  menu: (node, editor, texts) => [
    {
      type: 'checkbox',
      label: texts.openByDefault,
      checked: node.attrs.open === true,
      onCheckedChange: (open) => {
        editor.setAttrs({ open });
      },
    },
  ],
});

export const calloutBlock = defineBlock({
  name: 'callout',
  view: NuiEditorCalloutTone,
  menu: (node, editor, texts) => {
    const tone = calloutToneOf(node.attrs.tone);

    return [
      { type: 'sub', label: texts.tone, icon: tone, items: toneEntries(tone, editor, texts) },
    ];
  },
});

export const columnsBlock = defineBlock({
  name: 'columns',
  view: NuiEditorColumnsResize,
  at: 'end',
  slash: (texts) =>
    COLUMN_COUNTS.map((count) => ({
      key: `columns-${String(count)}`,
      label: texts.columns({ count }),
      icon: 'columns',
      keywords: ['columns', 'layout', String(count)],
      command: insertColumns(count),
    })),
});

const TABLE_SIZE = 3;

export const tableBlock = defineBlock({
  name: 'table',
  view: defineAsyncComponent(() => import('./table/NuiEditorTable.vue')),
  slash: (texts) => [
    {
      key: 'table',
      label: texts.table,
      icon: 'table',
      keywords: ['table', 'grid', 'data', 'таблица'],
      command: insertTable(
        Array.from({ length: TABLE_SIZE }, (_, index) => texts.tableColumn({ index: index + 1 })),
        TABLE_SIZE,
      ),
    },
  ],
});

export const editorBlocks: readonly NuiEditorBlock[] = [
  todoBlock,
  toggleBlock,
  calloutBlock,
  columnsBlock,
  tableBlock,
];
