import { contentSchema } from '@numior/content';
import type { DocJSON } from '@numior/editor-core';

const MARKETPLACE = '{ "sku": "S-101", "fabric": "Серый лён", "stock": 120 }';

const SHEET = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
        content: [{ text: 'Остатки тканей' }],
      },
      {
        id: 'lead',
        type: 'paragraph',
        content: [{ text: 'Склад обновляет таблицу каждый понедельник.' }],
      },
      {
        id: 'stock',
        type: 'table',
        content: [
          {
            id: 'head',
            type: 'table_head',
            content: [
              { id: 'fabric', type: 'table_column', attrs: { key: 'fabric', name: 'Ткань' } },
              {
                id: 'left',
                type: 'table_column',
                attrs: { key: 'left', name: 'Остаток, м', type: 'number' },
              },
              {
                id: 'arrives',
                type: 'table_column',
                attrs: { key: 'arrives', name: 'Поставка', type: 'date' },
              },
              {
                id: 'ordered',
                type: 'table_column',
                attrs: { key: 'ordered', name: 'Под заказ', type: 'boolean' },
              },
            ],
          },
          {
            id: 'body',
            type: 'table_body',
            content: [
              {
                id: 'gray',
                type: 'table_row',
                content: [
                  {
                    id: 'gray-1',
                    type: 'table_cell',
                    attrs: { column: 'fabric', value: 'Серый лён' },
                  },
                  { id: 'gray-2', type: 'table_cell', attrs: { column: 'left', value: 120 } },
                  {
                    id: 'gray-3',
                    type: 'table_cell',
                    attrs: { column: 'arrives', value: '2026-11-20' },
                  },
                  { id: 'gray-4', type: 'table_cell', attrs: { column: 'ordered', value: false } },
                ],
              },
              {
                id: 'dark',
                type: 'table_row',
                content: [
                  {
                    id: 'dark-1',
                    type: 'table_cell',
                    attrs: { column: 'fabric', value: 'Тёмный лён' },
                  },
                  { id: 'dark-2', type: 'table_cell', attrs: { column: 'left', value: 45 } },
                  {
                    id: 'dark-3',
                    type: 'table_cell',
                    attrs: { column: 'arrives', value: '2026-11-24' },
                  },
                  { id: 'dark-4', type: 'table_cell', attrs: { column: 'ordered', value: false } },
                ],
              },
              {
                id: 'blue',
                type: 'table_row',
                content: [
                  {
                    id: 'blue-1',
                    type: 'table_cell',
                    attrs: { column: 'fabric', value: 'Синий велюр' },
                  },
                  { id: 'blue-2', type: 'table_cell', attrs: { column: 'left', value: 0 } },
                  {
                    id: 'blue-3',
                    type: 'table_cell',
                    attrs: { column: 'arrives', value: '2026-12-03' },
                  },
                  { id: 'blue-4', type: 'table_cell', attrs: { column: 'ordered', value: true } },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'export',
        type: 'heading',
        attrs: { level: 3 },
        content: [{ text: 'Выгрузка для маркетплейса' }],
      },
      {
        id: 'export-lead',
        type: 'paragraph',
        content: [{ text: 'Склад отдаёт остаток каждой ткани строкой JSON:' }],
      },
      {
        id: 'export-code',
        type: 'code_block',
        attrs: { language: 'json' },
        content: [{ text: MARKETPLACE }],
      },
      {
        id: 'file',
        type: 'paragraph',
        content: [
          { text: 'Полный список: ' },
          {
            id: 'sheet',
            type: 'file',
            attrs: {
              url: 'https://files.example/fabrics.xlsx',
              name: 'Остатки тканей.xlsx',
              size: 48128,
              type: SHEET,
            },
          },
        ],
      },
    ],
  },
};
