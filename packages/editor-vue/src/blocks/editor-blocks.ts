import { defineAsyncComponent } from 'vue';
import { closedToggleBody, leaveClosedToggle, toggleTodo } from './block-commands';
import type { ElementNode } from '@numior/editor-core';
import type { NuiMenuEntry } from '@numior/vue';
import type { NuiEditorMessages } from '../editor/editor.messages';
import type { NuiEditorBlock, NuiEditorBlockContext } from './block.types';
import { calloutToneOf, toneEntries } from './callout/callout-tones';
import NuiEditorCalloutTone from './callout/NuiEditorCalloutTone.vue';
import NuiEditorCodeBar from './code/NuiEditorCodeBar.vue';
import { COLUMN_COUNTS, insertColumns } from './columns/columns';
import NuiEditorColumnsResize from './columns/NuiEditorColumnsResize.vue';
import { defineBlock } from './define-block';
import NuiEditorFile from './file/NuiEditorFile.vue';
import { follow } from './image/image-size';
import NuiEditorBookmark from './bookmark/NuiEditorBookmark.vue';
import NuiEditorEmbed from './embed/NuiEditorEmbed.vue';
import NuiEditorImage from './image/NuiEditorImage.vue';
import { insertTable } from './table/table-commands';
import NuiEditorTodoCheck from './todo/NuiEditorTodoCheck.vue';
import NuiEditorToggleButton from './toggle/NuiEditorToggleButton.vue';
import { NuiContentAlign, NuiContentWrap } from '@numior/content';

export const todoBlock = defineBlock({
  name: 'todo_item',
  view: NuiEditorTodoCheck,
  keymap: { 'Mod-Enter': toggleTodo },
});

export const toggleBlock = defineBlock({
  name: 'toggle',
  view: NuiEditorToggleButton,
  keymap: (editor) => ({ Enter: leaveClosedToggle(editor) }),
  conceals: closedToggleBody,
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

const linkOf = (value: unknown): string => (typeof value === 'string' ? value : '');

export const imageBlock = defineBlock({
  name: 'image',
  view: NuiEditorImage,
  handle: (node) =>
    node.attrs.wrap === NuiContentWrap.Break && node.attrs.align !== NuiContentAlign.Start
      ? 'beside'
      : 'push',
});

export const fileBlock = defineBlock({
  name: 'file',
  view: NuiEditorFile,
});

const openLink = (
  node: ElementNode,
  editor: NuiEditorBlockContext,
  texts: NuiEditorMessages,
): NuiMenuEntry[] => [
  {
    label: texts.openLink,
    icon: 'external-link',
    onSelect: () => {
      follow(editor.element(), linkOf(node.attrs.url), false);
    },
  },
];

export const embedBlock = defineBlock({
  name: 'embed',
  view: NuiEditorEmbed,
  menu: openLink,
});

export const bookmarkBlock = defineBlock({
  name: 'bookmark',
  view: NuiEditorBookmark,
  menu: openLink,
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
  embedBlock,
  bookmarkBlock,
];
