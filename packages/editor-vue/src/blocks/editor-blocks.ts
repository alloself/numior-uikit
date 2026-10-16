import { leaveClosedToggle, toggleTodo } from './block-commands';
import type { NuiEditorBlock } from './block.types';
import { calloutToneOf, toneEntries } from './callout/callout-tones';
import NuiEditorCalloutTone from './callout/NuiEditorCalloutTone.vue';
import { defineBlock } from './define-block';
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

export const editorBlocks: readonly NuiEditorBlock[] = [todoBlock, toggleBlock, calloutBlock];
