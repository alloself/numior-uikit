import { extendContentSchema } from '@numior/content';
import {
  createDoc,
  insertLeaf,
  renderTag,
  toJSON,
  wrapInBlock,
  type ContentNode,
  type ElementNode,
} from '@numior/editor-core';
import { defineBlock, type NuiEditorBlock } from '../../src';
import StampBlockView from '../fixtures/StampBlockView.vue';
import ToneBlockView from '../fixtures/ToneBlockView.vue';

export const blockSchema = extendContentSchema({
  stamp: {
    group: 'block',
    attrs: { label: { default: 'draft' } },
    render: (node) => renderTag('div', { class: 'stamp' }, [String(node.attrs.label)]),
  },
});

export const testBlocks: readonly NuiEditorBlock[] = [
  defineBlock({
    name: 'callout',
    view: ToneBlockView,
    keymap: { 'Mod-Alt-s': insertLeaf('stamp') },
    slash: () => [
      {
        key: 'box',
        label: 'Box',
        icon: 'info',
        keywords: ['box'],
        kind: 'command',
        command: wrapInBlock('callout'),
      },
    ],
    menu: (node, editor) => [
      { label: 'Make error', onSelect: () => editor.setAttrs({ tone: 'error' }) },
      { label: `Tone ${String(node.attrs.tone)}`, disabled: true },
    ],
  }),
  defineBlock({ name: 'stamp', view: StampBlockView }),
];

const element = (
  type: string,
  id: string,
  content: readonly (ContentNode | string)[] = [],
  attrs = {},
): ElementNode =>
  blockSchema.element(type, {
    id,
    attrs,
    content: content.map((child) => (typeof child === 'string' ? blockSchema.text(child) : child)),
  });

export const blockDocument = () =>
  toJSON(
    createDoc(
      blockSchema,
      blockSchema.element('doc', {
        id: 'root',
        content: [
          element('callout', 'c', [element('paragraph', 'cp', ['note'])], { tone: 'info' }),
          element('stamp', 's', [], { label: 'final' }),
          element('paragraph', 'p', ['after']),
        ],
      }),
    ),
  );
