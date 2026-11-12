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

const STATUSES = ['План', 'В работе', 'Готово'];

const PLAN_KEYS = ['task', 'due', 'budget', 'done', 'status'];

const column = (
  key: string,
  name: string,
  type: string,
  options: readonly string[] = [],
): ElementNode =>
  node(
    'table_column',
    options.map((label) => node('table_option', [], { label })),
    { key, name, type },
  );

const row = (...values: readonly (string | number | boolean | null)[]): ElementNode =>
  node(
    'table_row',
    values.map((value, index) => node('table_cell', [], { column: PLAN_KEYS[index] ?? '', value })),
  );

const plan = (): ElementNode =>
  node('table', [
    node('table_head', [
      column('task', 'Задача', 'text'),
      column('due', 'Срок', 'date'),
      column('budget', 'Бюджет', 'number'),
      column('done', 'Готово', 'boolean'),
      column('status', 'Статус', 'select', STATUSES),
    ]),
    node('table_body', [
      row('Лендинг', '2026-10-20', 120_000, true, 'Готово'),
      row('Рассылка', '2026-10-22', 45_000, false, 'В работе'),
      row('Вебинар', '2026-10-28', 80_000, false, 'План'),
    ]),
  ]);

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
        node('toggle', [paragraph('Детали релиза'), paragraph('Ветка release/2.4, миграций: 3.')]),
        node('code_block', ['pnpm release:check'], { language: 'bash' }),
        node(
          'code_block',
          [
            "const release = (version: string): boolean => {\n  return version.startsWith('2.');\n};",
          ],
          { language: 'ts' },
        ),
        node('divider'),
        paragraph('Наберите # и пробел для заголовка или - для списка.'),
        paragraph(
          node('image', [], {
            src: '/media/sunrise.svg',
            alt: 'Рассвет над заливом: солнце над горами и морем',
            caption: 'Рассвет над заливом',
            width: 0.45,
            align: 'start',
            wrap: 'wrap',
          }),
          'Обложку релиза снимали на рассвете над заливом. Картинка стоит с обтеканием: текст идёт справа от неё и переносится, пока не дойдёт до её нижнего края, а дальше занимает всю ширину строки. Режим меняется на панели картинки: в тексте, обтекание или отдельной строкой.',
        ),
        node('bookmark', [], {
          url: 'https://numior.test/blog/release-2-4',
          title: 'Релиз 2.4: редактор и загрузки',
          description: 'Что нового в редакторе: картинки, файлы, встраивания и закладки.',
          site: 'numior.test',
        }),
        paragraph(
          'Заметки лежат в файле ',
          node('file', [], {
            url: '/media/release-notes.txt',
            name: 'Заметки к релизу.txt',
            size: 97,
            type: 'text/plain',
          }),
          ' — прочитайте их перед созвоном.',
        ),
        plan(),
      ]),
    ),
  );

export const blockCount = (document: DocJSON): number => document.root.content?.length ?? 0;
