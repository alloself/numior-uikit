import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import { createIdSource } from '../model/node';
import type { AttrValue, ContentNode, ElementNode, IdSource, Mark } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { createRandom, type Random } from './random';
import { FixtureColumnType, FixtureList, type FixtureBlock } from './fixtures.types';

export interface GenerateOptions {
  readonly blocks: number;
  readonly seed?: number | undefined;
  readonly mix?: Partial<Readonly<Record<FixtureBlock, number>>> | undefined;
}

interface Generator {
  readonly schema: Schema;
  readonly random: Random;
  readonly ids: IdSource;
}

type ColumnType = FixtureColumnType;

interface FixtureColumn {
  readonly type: ColumnType;
  readonly options: readonly string[];
}

export const FIXTURE_MIX: Readonly<Record<FixtureBlock, number>> = {
  paragraph: 55,
  heading: 10,
  list: 12,
  table: 3,
  code: 5,
  image: 4,
  callout: 3,
  toggle: 3,
  columns: 2,
  quote: 2,
  divider: 1,
};

const KINDS: readonly FixtureBlock[] = [
  'paragraph',
  'heading',
  'list',
  'table',
  'code',
  'image',
  'callout',
  'toggle',
  'columns',
  'quote',
  'divider',
];

const WORDS = [
  'документ',
  'редактор',
  'таблица',
  'строка',
  'блок',
  'список',
  'заметка',
  'проект',
  'отчёт',
  'задача',
  'команда',
  'клиент',
  'сделка',
  'договор',
  'встреча',
  'релиз',
  'версия',
  'черновик',
  'раздел',
  'абзац',
  'ссылка',
  'подпись',
  'колонка',
  'ячейка',
  'формула',
  'бюджет',
  'склад',
  'заказ',
  'оплата',
  'доставка',
] as const;

const LISTS = [FixtureList.Bullet, FixtureList.Ordered, FixtureList.Todo] as const;

const TONES = ['info', 'success', 'warning', 'error'] as const;

const word = (generator: Generator): string => generator.random.pick(WORDS);

const sentence = (generator: Generator, min: number, max: number): string =>
  Array.from({ length: generator.random.int(min, max) }, () => word(generator)).join(' ');

const marksFor = (generator: Generator): Mark[] => {
  const { random, schema } = generator;
  const roll = random.next();

  if (roll < 0.06) {
    return [schema.mark('bold')];
  }
  if (roll < 0.1) {
    return [schema.mark('italic')];
  }
  if (roll < 0.12) {
    return [schema.mark('code')];
  }
  return roll < 0.14
    ? [schema.mark('link', { href: `https://example.com/${random.int(1, 999)}` })]
    : [];
};

const inline = (generator: Generator, min: number, max: number): ContentNode[] =>
  Array.from({ length: generator.random.int(min, max) }, (_, index) =>
    generator.schema.text(`${index === 0 ? '' : ' '}${word(generator)}`, marksFor(generator)),
  );

const element = (
  generator: Generator,
  type: string,
  content: readonly ContentNode[] = [],
  attrs: Readonly<Record<string, AttrValue>> = {},
): ElementNode => generator.schema.element(type, { id: generator.ids.next(), attrs, content });

const paragraph = (generator: Generator): ElementNode =>
  element(generator, 'paragraph', inline(generator, 4, 16));

const paragraphs = (generator: Generator, min: number, max: number): ElementNode[] =>
  Array.from({ length: generator.random.int(min, max) }, () => paragraph(generator));

const listOf = (generator: Generator, depth: number): ElementNode => {
  const kind = generator.random.pick(LISTS);
  const todo = kind === FixtureList.Todo;

  const items = Array.from({ length: generator.random.int(2, 5) }, () => {
    const nested = depth < 3 && generator.random.chance(0.2) ? [listOf(generator, depth + 1)] : [];
    const attrs = todo ? { checked: generator.random.chance(0.4) } : {};

    return element(
      generator,
      todo ? 'todo_item' : 'list_item',
      [paragraph(generator), ...nested],
      attrs,
    );
  });

  return element(generator, kind, items);
};

const COLUMN_TYPES = [
  FixtureColumnType.Text,
  FixtureColumnType.Number,
  FixtureColumnType.Date,
  FixtureColumnType.Boolean,
  FixtureColumnType.Select,
] as const;

const twoDigits = (value: number): string => String(value).padStart(2, '0');

const optionsOf = (generator: Generator, type: ColumnType): readonly string[] =>
  type === FixtureColumnType.Select
    ? [...new Set(Array.from({ length: 3 }, () => word(generator)))]
    : [];

const cellValue = (generator: Generator, column: FixtureColumn): AttrValue => {
  const { random } = generator;

  if (random.chance(0.1)) {
    return null;
  }
  switch (column.type) {
    case FixtureColumnType.Text:
      return sentence(generator, 1, 3);
    case FixtureColumnType.Number:
      return random.int(0, 99_999) / 10;
    case FixtureColumnType.Date:
      return `2026-${twoDigits(random.int(1, 12))}-${twoDigits(random.int(1, 28))}`;
    case FixtureColumnType.Boolean:
      return random.chance(0.5);
    case FixtureColumnType.Select:
      return column.options[random.int(0, column.options.length - 1)] ?? null;
  }
};

const table = (generator: Generator): ElementNode => {
  const columns = Array.from({ length: generator.random.int(2, 4) }, (): FixtureColumn => {
    const type = generator.random.pick(COLUMN_TYPES);

    return { type, options: optionsOf(generator, type) };
  });

  const head = element(
    generator,
    'table_head',
    columns.map((column) =>
      element(
        generator,
        'table_column',
        column.options.map((label) => element(generator, 'table_option', [], { label })),
        { name: word(generator), type: column.type },
      ),
    ),
  );

  const rows = Array.from({ length: generator.random.int(1, 5) }, () =>
    element(
      generator,
      'table_row',
      columns.map((column) =>
        element(generator, 'table_cell', [], { value: cellValue(generator, column) }),
      ),
    ),
  );

  return element(generator, 'table', [head, element(generator, 'table_body', rows)]);
};

const code = (generator: Generator): ElementNode => {
  const lines = Array.from(
    { length: generator.random.int(3, 8) },
    () => `const ${word(generator)} = ${generator.random.int(0, 999)};`,
  );

  return element(generator, 'code_block', [generator.schema.text(lines.join('\n'))], {
    language: 'ts',
  });
};

const image = (generator: Generator): ElementNode => {
  const picture = element(generator, 'image', [], {
    src: `https://example.com/images/${generator.random.int(1, 500)}.png`,
    alt: sentence(generator, 2, 5),
  });

  return generator.schema.nodes.get('image')?.inline === true
    ? element(generator, 'paragraph', [picture])
    : picture;
};

const BUILDERS: Readonly<Record<FixtureBlock, (generator: Generator) => ElementNode>> = {
  paragraph,
  heading: (generator) =>
    element(generator, 'heading', inline(generator, 2, 6), { level: generator.random.int(1, 3) }),
  list: (generator) => listOf(generator, 1),
  table,
  code,
  image,
  callout: (generator) =>
    element(generator, 'callout', paragraphs(generator, 1, 3), {
      tone: generator.random.pick(TONES),
    }),
  toggle: (generator) =>
    element(generator, 'toggle', [paragraph(generator), ...paragraphs(generator, 1, 2)]),
  columns: (generator) =>
    element(
      generator,
      'columns',
      Array.from({ length: generator.random.int(2, 3) }, () =>
        element(generator, 'column', paragraphs(generator, 1, 2)),
      ),
    ),
  quote: (generator) => element(generator, 'blockquote', paragraphs(generator, 1, 2)),
  divider: (generator) => element(generator, 'divider'),
};

const kindPicker = (random: Random, mix: Readonly<Record<FixtureBlock, number>>) => {
  const weights = KINDS.map((kind) => Math.max(0, mix[kind]));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    throw new RangeError(`The block mix needs at least one positive weight`);
  }
  return (): FixtureBlock => {
    let roll = random.next() * total;

    for (const [index, kind] of KINDS.entries()) {
      roll -= weights[index] ?? 0;

      if (roll < 0) {
        return kind;
      }
    }
    return 'paragraph';
  };
};

export const generateDoc = (schema: Schema, options: GenerateOptions): Doc => {
  if (!Number.isInteger(options.blocks) || options.blocks < 1) {
    throw new RangeError(`A generated document needs a positive whole number of blocks`);
  }

  const generator: Generator = {
    schema,
    random: createRandom(options.seed ?? 1),
    ids: createIdSource('b'),
  };

  const next = kindPicker(generator.random, { ...FIXTURE_MIX, ...options.mix });
  const blocks = Array.from({ length: options.blocks }, () => BUILDERS[next()](generator));

  return createDoc(schema, schema.element('doc', { id: generator.ids.next(), content: blocks }));
};
