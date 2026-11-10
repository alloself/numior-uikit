import { contentSchema } from '@numior/content';
import {
  applyStep,
  createDoc,
  createState,
  mapStep,
  stepMapOf,
  type Command,
  type Doc,
  type ElementNode,
  type Step,
} from '@numior/editor-core';
import { describe, expect, it } from 'vite-plus/test';
import { moveTableRow, orderTableColumns } from '../src/blocks/table/table-commands';

interface Carried {
  readonly doc: Doc;
  readonly steps: readonly Step[];
}

const element = (
  type: string,
  id: string,
  content: readonly ElementNode[] = [],
  attrs: Readonly<Record<string, string | number | null>> = {},
): ElementNode => contentSchema.element(type, { id, attrs, content });

const row = (id: string, ...values: readonly (string | number)[]): ElementNode =>
  element(
    'table_row',
    id,
    values.map((value, index) => element('table_cell', `${id}-${String(index)}`, [], { value })),
  );

const prices = (): Doc =>
  createDoc(
    contentSchema,
    element('doc', 'root', [
      element('table', 't', [
        element('table_head', 'h', [
          element('table_column', 'name', [], { name: 'Item' }),
          element('table_column', 'price', [], { name: 'Price', type: 'number' }),
        ]),
        element('table_body', 'b', [row('r1', 'Pears', 12), row('r2', 'Plums', 3)]),
      ]),
    ]),
  );

const carried = (start: Doc, command: Command): Carried => {
  const state = createState({ doc: start });
  let done: Carried = { doc: start, steps: [] };

  command(state, (tr) => {
    done = { doc: tr.doc, steps: tr.steps };
  });

  return done;
};

const priced = (doc: Doc, cell: string, value: number): Step => ({
  kind: 'attrs',
  pos: doc.positionOf(cell) ?? -1,
  attrs: { value },
});

const landed = (written: Step, { doc, steps }: Carried): Doc => {
  const moved = steps.reduce<Step | undefined>(
    (step, passed) => (step === undefined ? undefined : mapStep(step, stepMapOf(passed))),
    written,
  );

  const result = moved === undefined ? undefined : applyStep(doc, moved);

  return result?.ok === true ? result.doc : doc;
};

const valuesOf = (doc: Doc): readonly string[] =>
  (doc.byId('b')?.content ?? []).map((line) =>
    line.kind === 'element'
      ? line.content
          .map((cell) => (cell.kind === 'element' ? `${cell.id}=${String(cell.attrs.value)}` : ''))
          .join(' ')
      : '',
  );

describe('rows and columns carried in a document table', () => {
  it('keeps a value someone else writes into a row while it is carried down', () => {
    const start = prices();
    const moved = carried(start, moveTableRow('t', 'r1', 1));

    expect(valuesOf(landed(priced(start, 'r1-1', 99), moved))).toEqual([
      'r2-0=Plums r2-1=3',
      'r1-0=Pears r1-1=99',
    ]);
  });

  it('keeps a value someone else writes into a column while the columns change places', () => {
    const start = prices();
    const moved = carried(start, orderTableColumns('t', ['price', 'name']));

    expect(valuesOf(landed(priced(start, 'r2-1', 7), moved))).toEqual([
      'r1-1=12 r1-0=Pears',
      'r2-1=7 r2-0=Plums',
    ]);
  });
});
