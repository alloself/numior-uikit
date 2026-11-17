import { contentSchema } from '@numior/kit/content';
import type { DocJSON } from '@numior/kit/editor-core';

const MARKETPLACE = '{ "sku": "S-101", "fabric": "Gray linen", "stock": 120 }';

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
        content: [{ text: 'Fabric stock' }],
      },
      {
        id: 'lead',
        type: 'paragraph',
        content: [{ text: 'The warehouse updates this table every Monday.' }],
      },
      {
        id: 'stock',
        type: 'table',
        content: [
          {
            id: 'head',
            type: 'table_head',
            content: [
              { id: 'fabric', type: 'table_column', attrs: { key: 'fabric', name: 'Fabric' } },
              {
                id: 'left',
                type: 'table_column',
                attrs: { key: 'left', name: 'Left, yd', type: 'number' },
              },
              {
                id: 'arrives',
                type: 'table_column',
                attrs: { key: 'arrives', name: 'Arrives', type: 'date' },
              },
              {
                id: 'ordered',
                type: 'table_column',
                attrs: { key: 'ordered', name: 'Made to order', type: 'boolean' },
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
                    attrs: { column: 'fabric', value: 'Gray linen' },
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
                    attrs: { column: 'fabric', value: 'Dark linen' },
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
                    attrs: { column: 'fabric', value: 'Blue velvet' },
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
        content: [{ text: 'Marketplace export' }],
      },
      {
        id: 'export-lead',
        type: 'paragraph',
        content: [{ text: 'The warehouse sends the stock of each fabric as a JSON line:' }],
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
          { text: 'Full list: ' },
          {
            id: 'sheet',
            type: 'file',
            attrs: {
              url: 'https://files.example/fabrics.xlsx',
              name: 'Fabric stock.xlsx',
              size: 48128,
              type: SHEET,
            },
          },
        ],
      },
    ],
  },
};
