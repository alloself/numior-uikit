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
import { defineComponent, h } from 'vue';
import {
  defineBlock,
  defineBlockState,
  type NuiEditorBlock,
  type NuiEditorBlockContext,
} from '../../src';

export const blockSchema = extendContentSchema({
  stamp: {
    group: 'block',
    attrs: { label: { default: 'draft' } },
    render: (node) => renderTag('div', { class: 'stamp' }, [String(node.attrs.label)]),
  },
});

const clicks = defineBlockState(() => 0);

const ToneView = defineComponent(
  (props: { node: ElementNode; editor: NuiEditorBlockContext }) => {
    const count = clicks.use(props.node);

    return () =>
      h(
        'button',
        {
          type: 'button',
          onClick: () => {
            count.value += 1;
            props.editor.setAttrs({ tone: 'warning' });
          },
        },
        `${String(props.node.attrs.tone)} ${String(count.value)}`,
      );
  },
  { props: ['node', 'editor'] },
);

const StampView = defineComponent(
  (props: { node: ElementNode }) => () => h('span', `stamp ${String(props.node.attrs.label)}`),
  { props: ['node'] },
);

export const testBlocks: readonly NuiEditorBlock[] = [
  defineBlock({
    name: 'callout',
    view: ToneView,
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
  defineBlock({ name: 'stamp', view: StampView }),
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
