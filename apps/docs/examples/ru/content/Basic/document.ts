import { contentSchema } from '@numior/content';
import type { DocJSON } from '@numior/editor-core';

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
        content: [{ text: 'Кресло «Осло»' }],
      },
      {
        id: 'lead',
        type: 'paragraph',
        content: [
          { text: 'Мягкое кресло на каркасе из ' },
          { text: 'массива дуба', marks: [{ type: 'bold' }] },
          { text: '. Чехол снимается и стирается при 30\u00a0°C.' },
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
                content: [{ text: 'Ширина 78 см, глубина 84 см, высота 92 см' }],
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
                content: [{ text: 'Высота сиденья 42 см' }],
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
                content: [{ text: 'Выдерживает до 120 кг' }],
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
            content: [{ text: 'Не ставьте кресло вплотную к батарее: дуб рассыхается.' }],
          },
        ],
      },
      {
        id: 'care',
        type: 'toggle',
        content: [
          { id: 'care-title', type: 'paragraph', content: [{ text: 'Уход за чехлом' }] },
          {
            id: 'care-text',
            type: 'paragraph',
            content: [{ text: 'Стирайте чехол отдельно от цветных вещей и сушите расправленным.' }],
          },
        ],
      },
    ],
  },
};
