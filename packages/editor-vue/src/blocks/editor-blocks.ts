import { defineAsyncComponent } from 'vue';
import { leaveClosedToggle, toggleTodo } from './block-commands';
import type { NuiEditorBlock } from './block.types';
import { calloutToneOf, toneEntries } from './callout/callout-tones';
import NuiEditorCalloutTone from './callout/NuiEditorCalloutTone.vue';
import NuiEditorCodeBar from './code/NuiEditorCodeBar.vue';
import { COLUMN_COUNTS, insertColumns } from './columns/columns';
import NuiEditorColumnsResize from './columns/NuiEditorColumnsResize.vue';
import { defineBlock } from './define-block';
import NuiEditorFile from './file/NuiEditorFile.vue';
import { alignOf, download } from './image/image-size';
import NuiEditorImage from './image/NuiEditorImage.vue';
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

export const codeBlock = defineBlock({
  name: 'code_block',
  view: NuiEditorCodeBar,
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
      kind: 'command',
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
      kind: 'command',
      command: insertTable(
        Array.from({ length: TABLE_SIZE }, (_, index) => texts.tableColumn({ index: index + 1 })),
        TABLE_SIZE,
      ),
    },
  ],
});

const ALIGN_ICONS = { start: 'align-start', center: 'align-center', end: 'align-end' } as const;

const linkOf = (value: unknown): string => (typeof value === 'string' ? value : '');

export const imageBlock = defineBlock({
  name: 'image',
  view: NuiEditorImage,
  handle: 'beside',
  menu: (node, editor, texts) => {
    const align = alignOf(node.attrs.align);

    return [
      {
        type: 'sub',
        label: texts.imageAlign,
        icon: ALIGN_ICONS[align],
        items: [
          {
            type: 'radio-group',
            value: align,
            onChange: (value) => {
              editor.setAttrs({ align: alignOf(value) });
            },
            items: [
              { value: 'start', label: texts.imageAlignStart, icon: ALIGN_ICONS.start },
              { value: 'center', label: texts.imageAlignCenter, icon: ALIGN_ICONS.center },
              { value: 'end', label: texts.imageAlignEnd, icon: ALIGN_ICONS.end },
            ],
          },
        ],
      },
      {
        label: texts.download,
        icon: 'download',
        onSelect: () => {
          download(editor.element(), linkOf(node.attrs.src));
        },
      },
    ];
  },
});

export const fileBlock = defineBlock({
  name: 'file',
  view: NuiEditorFile,
  menu: (node, editor, texts) => [
    {
      label: texts.download,
      icon: 'download',
      onSelect: () => {
        download(editor.element(), linkOf(node.attrs.url));
      },
    },
  ],
});

export const editorBlocks: readonly NuiEditorBlock[] = [
  todoBlock,
  toggleBlock,
  calloutBlock,
  codeBlock,
  columnsBlock,
  tableBlock,
  imageBlock,
  fileBlock,
];
