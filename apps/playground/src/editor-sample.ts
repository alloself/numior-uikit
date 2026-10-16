import {
  createDoc,
  createIdSource,
  toJSON,
  type ContentNode,
  type DocJSON,
  type ElementNode,
} from '@numior/editor-core';
import { playgroundSchema } from './editor-blocks';

type Child = ContentNode | string;

const ids = createIdSource('s');

const node = (
  type: string,
  content: readonly Child[] = [],
  attrs: Readonly<Record<string, string | number | boolean | null>> = {},
): ElementNode =>
  playgroundSchema.element(type, {
    id: ids.next(),
    attrs,
    content: content.map((child) =>
      typeof child === 'string' ? playgroundSchema.text(child) : child,
    ),
  });

const marked = (text: string, ...marks: readonly string[]): ContentNode =>
  playgroundSchema.text(
    text,
    marks.map((mark) => playgroundSchema.mark(mark)),
  );

const paragraph = (...content: readonly Child[]): ElementNode => node('paragraph', content);

const item = (text: string): ElementNode => node('list_item', [paragraph(text)]);

export const editorSample = (): DocJSON =>
  toJSON(
    createDoc(
      playgroundSchema,
      node('doc', [
        node('heading', ['План запуска'], { level: 2 }),
        paragraph(
          'Черновик для ',
          node('mention', [], { user: 'anna', label: 'Анна' }),
          ': ',
          marked('сроки', 'bold'),
          ', ',
          marked('риски', 'italic'),
          ' и ',
          marked('npm run build', 'code'),
          '.',
        ),
        node('bullet_list', [item('Собрать отзывы'), item('Обновить тарифы')]),
        node('todo_list', [
          node('todo_item', [paragraph('Согласовать дату')], { checked: true }),
          node('todo_item', [paragraph('Подготовить письмо')]),
        ]),
        node('task_status', [], { status: 'doing' }),
        node('blockquote', [paragraph('Сначала качество, потом скорость.')]),
        node('callout', [paragraph('Релиз во вторник в 10:00.')], { tone: 'info' }),
        node('code_block', ['pnpm release:check'], { language: 'bash' }),
        node('divider'),
        paragraph('Наберите # и пробел для заголовка или - для списка.'),
      ]),
    ),
  );

export const blockCount = (document: DocJSON): number => document.root.content?.length ?? 0;
