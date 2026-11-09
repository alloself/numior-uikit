import { describe, expect, it } from 'vite-plus/test';
import {
  createStepCodec,
  createWorkbook,
  parseFormula,
  type Workbook,
  type WorkbookStep,
} from '../src/core';
import { EMPTY_LAYOUT, lineLayoutsOf } from '../src/core/layout/line-layouts';
import type { LineLayout, SheetLayout } from '../src/core/layout/layout.types';
import { StepKind } from '../src/core/steps/step.types';

type Rejected = readonly [what: string, value: unknown];

const FORMULAS = [
  '=A1+$B$2',
  '=SUM(A1:B2,Sheet2!C:C)',
  '=-A1%',
  '={1,2;3,4}',
  '=IF(,1,"x")',
  '=Table1[[#Data],[a]:[b]]',
  '=1:3',
  '=rate*TRUE',
  '=A1#',
  '=#N/A',
];

const LINE: LineLayout = {
  size: 30,
  custom: true,
  hidden: false,
  level: 1,
  collapsed: false,
  style: undefined,
  extra: [['spans', '1:2']],
};

const PLAIN_STEPS: readonly (readonly [string, WorkbookStep])[] = [
  [
    'cells',
    {
      kind: 'setCells',
      sheet: 'S',
      cells: [
        { row: 1, col: 2, content: { kind: 'value', value: { kind: 'number', value: 1.5 } } },
        { row: 3, col: 4, content: { kind: 'empty' }, format: '0.00' },
        { row: 5, col: 6, decoration: { font: { bold: true }, fill: { pattern: 'solid' } } },
      ],
    },
  ],
  [
    'a format',
    {
      kind: 'setFormat',
      sheet: 'S',
      range: { top: 0, left: 0, bottom: 2, right: 2 },
      format: '@',
    },
  ],
  ['inserted lines', { kind: 'insertLines', sheet: 'S', axis: 'rows', at: 2, count: 3 }],
  ['deleted lines', { kind: 'deleteLines', sheet: 'S', axis: 'cols', at: 0, count: 1 }],
  ['a new sheet', { kind: 'addSheet', name: 'T', index: 1 }],
  ['a removed sheet', { kind: 'removeSheet', name: 'T' }],
  ['a renamed sheet', { kind: 'renameSheet', from: 'S', to: 'T' }],
  ['a cleared name', { kind: 'setName', name: 'rate', ast: undefined }],
  [
    'a table',
    {
      kind: 'addTable',
      name: 'People',
      table: {
        sheet: 'S',
        range: { top: 0, left: 0, bottom: 4, right: 1 },
        columns: ['a', 'b'],
        headers: true,
        totals: false,
      },
    },
  ],
  ['a renamed table', { kind: 'renameTable', from: 'People', to: 'Staff' }],
  [
    'a conditional rule',
    {
      kind: 'setConditional',
      sheet: 'S',
      formats: [
        {
          ranges: [{ top: 0, left: 0, bottom: 1, right: 1 }],
          rules: [
            {
              rule: { kind: 'blanks', style: { format: '0' } },
              priority: 1,
              stopIfTrue: false,
            },
          ],
        },
      ],
    },
  ],
  ['a refreshed pivot', { kind: 'refreshPivot', sheet: 'S', name: 'P' }],
  ['a batch', { kind: 'batch', steps: [{ kind: 'removeSheet', name: 'T' }] }],
];

const CELL: Readonly<Record<string, unknown>> = { row: 0, col: 0 };

const REJECTED: readonly Rejected[] = [
  ['nothing', null],
  ['a string', 'setCells'],
  ['an unknown kind', { kind: 'nope' }],
  ['a kind from the prototype', { kind: 'constructor' }],
  ['a sheet that is not text', { kind: 'removeSheet', name: 1 }],
  ['a row past the sheet', { kind: 'setCells', sheet: 'S', cells: [{ ...CELL, row: 1_048_576 }] }],
  ['a fractional column', { kind: 'setCells', sheet: 'S', cells: [{ ...CELL, col: 0.5 }] }],
  ['no lines', { kind: 'insertLines', sheet: 'S', axis: 'rows', at: 0, count: 0 }],
  ['an unknown axis', { kind: 'insertLines', sheet: 'S', axis: 'z', at: 0, count: 1 }],
  [
    'an unknown formula node',
    {
      kind: 'setCells',
      sheet: 'S',
      cells: [{ ...CELL, content: { kind: 'formula', ast: { kind: 'eval', code: 'x' } } }],
    },
  ],
  ['a broken batch', { kind: 'batch', steps: [{ kind: 'nope' }] }],
];

const astOf = (text: string) => {
  const parsed = parseFormula(text);

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return parsed.ast;
};

const layoutWith = (patch: Partial<SheetLayout>): WorkbookStep => ({
  kind: 'setLayout',
  sheet: 'S',
  layout: { ...EMPTY_LAYOUT, ...patch },
});

const overWire = (
  step: WorkbookStep,
  from: Workbook = createWorkbook(),
  to: Workbook = from,
): WorkbookStep | undefined => {
  const wire: unknown = JSON.parse(JSON.stringify(createStepCodec(from).encode(step)));

  return createStepCodec(to).decode(wire);
};

const layoutOf = (step: WorkbookStep | undefined): SheetLayout => {
  if (step?.kind !== StepKind.SetLayout) {
    throw new Error('the step is not a layout');
  }
  return step.layout;
};

const pictureBytes = (layout: SheetLayout): Uint8Array | undefined => {
  const content = layout.drawings[0]?.content;

  return content?.kind === 'picture' ? content.bytes : undefined;
};

const pictureStep = (bytes: string | Uint8Array): unknown => {
  const book = createWorkbook();

  const step = layoutWith({
    drawings: [
      {
        id: 'd',
        name: 'Picture',
        alt: '',
        anchor: { kind: 'point', x: 0, y: 0, width: 10, height: 10 },
        content: {
          kind: 'picture',
          media: 'xl/media/a.png',
          type: 'image/png',
          bytes: typeof bytes === 'string' ? new Uint8Array() : bytes,
        },
      },
    ],
  });

  const wire: unknown = JSON.parse(JSON.stringify(createStepCodec(book).encode(step)));

  return typeof bytes === 'string' ? replaceBytes(wire, bytes) : wire;
};

const replaceBytes = (value: unknown, bytes: string): unknown =>
  JSON.parse(JSON.stringify(value).replaceAll('"bytes":""', `"bytes":"${bytes}"`));

describe('workbook steps on the wire', () => {
  it.each(PLAIN_STEPS)('keeps %s', (_what, step) => {
    const decoded = overWire(step);

    expect(decoded).toEqual(step);
  });

  it.each(FORMULAS)('keeps the formula %s', (formula) => {
    const step: WorkbookStep = {
      kind: 'setCells',
      sheet: 'S',
      cells: [{ row: 0, col: 0, content: { kind: 'formula', ast: astOf(formula) } }],
    };

    const decoded = overWire(step);

    expect(decoded).toEqual(step);
  });

  it('carries line layouts as entries', () => {
    const step = layoutWith({ rows: lineLayoutsOf([[3, LINE]]) });

    const layout = layoutOf(overWire(step));

    expect(layout.rows.get(3)).toEqual(LINE);
    expect(layout.rows.get(2)).toBeUndefined();
  });

  it('turns line styles into ids of the receiving book', () => {
    const from = createWorkbook();
    const to = createWorkbook();

    to.formats.id('0.000');
    const format = from.formats.id('#,##0');
    const decoration = from.decorations.id({ font: { bold: true } });

    const step = layoutWith({
      cols: lineLayoutsOf([[1, { ...LINE, style: { format, decoration } }]]),
    });

    const style = layoutOf(overWire(step, from, to)).cols.get(1)?.style;

    expect(to.formats.code(style?.format ?? 0)).toBe('#,##0');
    expect(to.decorations.get(style?.decoration ?? 0)).toEqual({ font: { bold: true } });
  });

  it('carries picture bytes longer than one encoding piece', () => {
    const bytes = Uint8Array.from({ length: 70_000 }, (_value, index) => index % 256);

    const decoded = createStepCodec(createWorkbook()).decode(pictureStep(bytes));

    expect(pictureBytes(layoutOf(decoded))).toEqual(bytes);
  });

  it('refuses picture bytes that are not base64', () => {
    const decoded = createStepCodec(createWorkbook()).decode(pictureStep('%%%'));

    expect(decoded).toBeUndefined();
  });

  it.each(REJECTED)('refuses %s', (_what, value) => {
    const decoded = createStepCodec(createWorkbook()).decode(value);

    expect(decoded).toBeUndefined();
  });
});
