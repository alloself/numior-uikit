import { yjsBinding } from '@numior/collaboration/yjs';
import { contentSchema } from '@numior/content';
import { createDoc, type ElementNode } from '@numior/editor-core';
import type { Doc as YDoc } from 'yjs';

const paragraph = (id: string, text: string): ElementNode =>
  contentSchema.element('paragraph', { id, content: [contentSchema.text(text)] });

const item = (id: string, text: string): ElementNode =>
  contentSchema.element('list_item', { id, content: [paragraph(`${id}-line`, text)] });

const START = createDoc(
  contentSchema,
  contentSchema.element(contentSchema.top.name, {
    id: 'root',
    content: [
      contentSchema.element('heading', {
        id: 'start-title',
        attrs: { level: 2 },
        content: [contentSchema.text('План релиза')],
      }),
      paragraph('start-goal', 'Выпускаем таблицу и редактор в одном релизе.'),
      contentSchema.element('bullet_list', {
        id: 'start-list',
        content: [
          item('start-docs', 'Документация'),
          item('start-tests', 'Тесты в браузерах'),
          item('start-notes', 'Заметки к выпуску'),
        ],
      }),
      paragraph('start-end', 'Сроки обсуждаем в пятницу.'),
    ],
  }),
);

export const seedStart = (ydoc: YDoc): void => {
  const binding = yjsBinding(ydoc, 'document', {
    schema: contentSchema,
    getState: () => undefined,
    dispatch: () => undefined,
  });

  binding.seed(START);
  binding.destroy();
};
