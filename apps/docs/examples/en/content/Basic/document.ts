import { contentSchema } from '@numior/kit/content';
import type { DocJSON } from '@numior/kit/editor-core';

export const document: DocJSON = {
  format: 1,
  schema: { name: contentSchema.name, version: contentSchema.version },
  root: {
    id: 'doc',
    type: 'doc',
    content: [
      {
        id: 'title',
        type: 'heading',
        attrs: { level: 2 },
        content: [{ text: 'Oslo armchair' }],
      },
      {
        id: 'lead',
        type: 'paragraph',
        content: [
          { text: 'A soft armchair on a ' },
          { text: 'solid oak', marks: [{ type: 'bold' }] },
          { text: ' frame. The cover comes off and washes at 30\u00a0°C.' },
        ],
      },
      {
        id: 'sizes',
        type: 'bullet_list',
        content: [
          {
            id: 'size',
            type: 'list_item',
            content: [
              {
                id: 'size-text',
                type: 'paragraph',
                content: [{ text: '31 in wide, 33 in deep, 36 in high' }],
              },
            ],
          },
          {
            id: 'seat',
            type: 'list_item',
            content: [
              {
                id: 'seat-text',
                type: 'paragraph',
                content: [{ text: 'Seat height 16.5 in' }],
              },
            ],
          },
          {
            id: 'load',
            type: 'list_item',
            content: [
              {
                id: 'load-text',
                type: 'paragraph',
                content: [{ text: 'Holds up to 265 lb' }],
              },
            ],
          },
        ],
      },
      {
        id: 'warning',
        type: 'callout',
        attrs: { tone: 'warning' },
        content: [
          {
            id: 'warning-text',
            type: 'paragraph',
            content: [{ text: 'Keep the chair away from radiators: oak dries out and cracks.' }],
          },
        ],
      },
      {
        id: 'care',
        type: 'toggle',
        content: [
          { id: 'care-title', type: 'paragraph', content: [{ text: 'Cover care' }] },
          {
            id: 'care-text',
            type: 'paragraph',
            content: [{ text: 'Wash the cover apart from colored laundry and dry it flat.' }],
          },
        ],
      },
    ],
  },
};
