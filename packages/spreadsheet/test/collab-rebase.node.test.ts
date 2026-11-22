import { describe, expect, it } from 'vite-plus/test';
import {
  EN_FORMULAS,
  lineLayoutsOf,
  parseFormula,
  printFormula,
  type LineLayout,
  type SheetLayout,
  type WorkbookStep,
} from '../src/core';
import { RemoteChangeKind, type RemoteChange } from '../src/core/collab/collab.types';
import { layoutDelta, mergeLayouts, patchLayout } from '../src/core/layout/merge-layout';
import { rebaseStep } from '../src/core/collab/rebase-step';
import { changeOver, changesOf } from '../src/core/collab/remote-change';
import type { SheetDrawing } from '../src/core/drawings/drawing.types';
import type { LineChange } from '../src/core/formula/rewrite';
import { EMPTY_LAYOUT } from '../src/core/layout/line-layouts';
import type { PivotSource, PivotSpec, PivotState } from '../src/core/pivot/pivot.types';
import { StepKind, type TableSpec } from '../src/core/steps/step.types';

type Scenario = readonly [
  what: string,
  step: WorkbookStep,
  change: RemoteChange,
  after: object | undefined,
];

const lines = (
  sheet: string,
  axis: LineChange['axis'],
  at: number,
  count: number,
): RemoteChange => ({
  kind: RemoteChangeKind.Lines,
  change: { sheet, axis, at, count },
});

const INSERTED = lines('S', 'rows', 1, 2);

const REMOVED_ROWS = lines('S', 'rows', 1, -2);

const OTHER_SHEET = lines('Q', 'rows', 0, 5);

const COLUMNS = lines('S', 'cols', 0, 1);

const TABLE_RENAMED: RemoteChange = {
  kind: RemoteChangeKind.RenameTable,
  from: 'People',
  to: 'Staff',
};

const RANGE = { top: 3, left: 0, bottom: 4, right: 1 };

const MOVED_RANGE = { top: 5, left: 0, bottom: 6, right: 1 };

const GONE_RANGE = { top: 1, left: 0, bottom: 2, right: 1 };

const TABLE: TableSpec = {
  sheet: 'S',
  range: RANGE,
  columns: ['a', 'b'],
  headers: true,
  totals: false,
};

const LOST: PivotSource = { kind: 'lost' };

const SOURCE: PivotSource = { kind: 'range', sheet: 'S', range: RANGE };

const pivotOf = (source: PivotSource, row = 3): PivotSpec => ({
  anchor: { row, col: 0 },
  definition: {
    source,
    rows: [],
    columns: [],
    filters: [],
    values: [],
    fields: [],
    layout: 'compact',
    rowTotals: true,
    columnTotals: true,
    autofit: false,
    captions: {
      rows: 'r',
      columns: 'c',
      values: 'v',
      total: 't',
      grandTotal: 'g',
      blank: 'b',
      all: 'a',
      multiple: 'm',
    },
  },
});

const stateOf = (spec: PivotSpec): PivotState => ({ ...spec, footprint: RANGE });

const SET_CELLS: WorkbookStep = {
  kind: 'setCells',
  sheet: 'S',
  cells: [{ row: 3, col: 0, format: '0' }],
};

const LINE: LineLayout = {
  size: 20,
  custom: true,
  hidden: false,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
};

const SCENARIOS: readonly Scenario[] = [
  [
    'moves a format range',
    { kind: 'setFormat', sheet: 'S', range: RANGE, format: '0' },
    INSERTED,
    { range: MOVED_RANGE },
  ],
  [
    'keeps a format range on another sheet',
    { kind: 'setFormat', sheet: 'S', range: RANGE, format: '0' },
    OTHER_SHEET,
    { range: RANGE },
  ],
  [
    'drops a format range that is gone',
    { kind: 'setFormat', sheet: 'S', range: GONE_RANGE, format: '0' },
    REMOVED_ROWS,
    undefined,
  ],
  [
    'drops cells that are gone',
    { kind: 'setCells', sheet: 'S', cells: [{ row: 1, col: 0, format: '0' }] },
    REMOVED_ROWS,
    undefined,
  ],
  ['moves cells by columns', SET_CELLS, COLUMNS, { cells: [{ row: 3, col: 1, format: '0' }] }],
  [
    'moves an insertion',
    { kind: 'insertLines', sheet: 'S', axis: 'rows', at: 3, count: 1 },
    INSERTED,
    { at: 5 },
  ],
  [
    'keeps an insertion on another axis',
    { kind: 'insertLines', sheet: 'S', axis: 'rows', at: 3, count: 1 },
    COLUMNS,
    { at: 3 },
  ],
  [
    'collapses an insertion into a deletion',
    { kind: 'insertLines', sheet: 'S', axis: 'rows', at: 2, count: 1 },
    REMOVED_ROWS,
    { at: 1 },
  ],
  [
    'shrinks a deletion',
    { kind: 'deleteLines', sheet: 'S', axis: 'rows', at: 2, count: 3 },
    REMOVED_ROWS,
    { at: 1, count: 2 },
  ],
  [
    'drops a deletion of removed lines',
    { kind: 'deleteLines', sheet: 'S', axis: 'rows', at: 1, count: 2 },
    REMOVED_ROWS,
    undefined,
  ],
  ['keeps a new sheet', { kind: 'addSheet', name: 'N', index: 0 }, INSERTED, { name: 'N' }],
  [
    'moves a new table',
    { kind: 'addTable', name: 'People', table: TABLE },
    INSERTED,
    { table: { ...TABLE, range: MOVED_RANGE } },
  ],
  [
    'keeps a table above the change',
    {
      kind: 'addTable',
      name: 'People',
      table: { ...TABLE, range: { ...RANGE, top: 8, bottom: 9 } },
    },
    lines('S', 'rows', 12, 1),
    { name: 'People' },
  ],
  [
    'drops a table in removed lines',
    { kind: 'addTable', name: 'People', table: { ...TABLE, range: GONE_RANGE } },
    REMOVED_ROWS,
    undefined,
  ],
  [
    'drops a table change in removed lines',
    { kind: 'setTable', name: 'People', table: { ...TABLE, range: GONE_RANGE } },
    REMOVED_ROWS,
    undefined,
  ],
  [
    'renames a table being removed',
    { kind: 'setTable', name: 'People', table: undefined },
    TABLE_RENAMED,
    { name: 'Staff', table: undefined },
  ],
  [
    'follows a renamed table',
    { kind: 'renameTable', from: 'People', to: 'Crew' },
    TABLE_RENAMED,
    { from: 'Staff' },
  ],
  [
    'keeps a removed pivot',
    { kind: 'setPivot', sheet: 'S', name: 'P', pivot: undefined },
    TABLE_RENAMED,
    { sheet: 'S', pivot: undefined },
  ],
  [
    'moves a pivot anchor',
    { kind: 'setPivot', sheet: 'S', name: 'P', pivot: pivotOf(LOST) },
    INSERTED,
    { pivot: { anchor: { row: 5, col: 0 } } },
  ],
  [
    'drops a pivot in removed lines',
    { kind: 'setPivot', sheet: 'S', name: 'P', pivot: pivotOf(LOST, 1) },
    REMOVED_ROWS,
    undefined,
  ],
  [
    'moves a pivot source',
    { kind: 'setPivot', sheet: 'Q', name: 'P', pivot: pivotOf(SOURCE) },
    INSERTED,
    { pivot: { definition: { source: { range: MOVED_RANGE } } } },
  ],
  [
    'loses a source in removed lines',
    { kind: 'setPivot', sheet: 'Q', name: 'P', pivot: pivotOf({ ...SOURCE, range: GONE_RANGE }) },
    REMOVED_ROWS,
    { pivot: { definition: { source: LOST } } },
  ],
  [
    'follows a renamed source table',
    { kind: 'setPivot', sheet: 'Q', name: 'P', pivot: pivotOf({ kind: 'table', name: 'People' }) },
    TABLE_RENAMED,
    { pivot: { definition: { source: { name: 'Staff' } } } },
  ],
  [
    'keeps another source table',
    { kind: 'setPivot', sheet: 'Q', name: 'P', pivot: pivotOf({ kind: 'table', name: 'Other' }) },
    TABLE_RENAMED,
    { pivot: { definition: { source: { name: 'Other' } } } },
  ],
  [
    'moves a restored pivot',
    {
      kind: 'putPivot',
      sheet: 'S',
      name: 'P',
      pivot: stateOf(pivotOf(LOST)),
      cells: [{ row: 3, col: 0, format: '0' }],
    },
    INSERTED,
    {
      pivot: { anchor: { row: 5, col: 0 }, footprint: MOVED_RANGE },
      cells: [{ row: 5, col: 0, format: '0' }],
    },
  ],
  [
    'keeps a restore without a pivot',
    { kind: 'putPivot', sheet: 'S', name: 'P', pivot: undefined },
    TABLE_RENAMED,
    { sheet: 'S', pivot: undefined, cells: undefined, layout: undefined },
  ],
  [
    'keeps a layout on a renamed table',
    { kind: 'setLayout', sheet: 'S', layout: EMPTY_LAYOUT },
    TABLE_RENAMED,
    { sheet: 'S' },
  ],
  [
    'keeps the rules on a renamed table',
    { kind: 'setConditional', sheet: 'S', formats: [] },
    TABLE_RENAMED,
    { formats: [] },
  ],
  [
    'moves the rules with lines',
    { kind: 'setConditional', sheet: 'S', formats: [{ ranges: [RANGE], rules: [] }] },
    INSERTED,
    { formats: [{ ranges: [MOVED_RANGE] }] },
  ],
  [
    'keeps the rules of another sheet',
    { kind: 'setConditional', sheet: 'Q', formats: [{ ranges: [RANGE], rules: [] }] },
    INSERTED,
    { formats: [{ ranges: [RANGE] }] },
  ],
];

const astOf = (text: string, origin = { row: 0, col: 0 }) => {
  const parsed = parseFormula(text, EN_FORMULAS, origin);

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return parsed.ast;
};

const formulaStep = (text: string): WorkbookStep => ({
  kind: 'setCells',
  sheet: 'Q',
  cells: [{ row: 0, col: 0, content: { kind: 'formula', ast: astOf(text) } }],
});

const printedAfter = (step: WorkbookStep | undefined): string => {
  const content = step?.kind === StepKind.SetCells ? step.cells[0]?.content : undefined;

  return content?.kind === 'formula' ? printFormula(content.ast) : '';
};

const drawing = (id: string, name: string): SheetDrawing => ({
  id,
  name,
  alt: '',
  anchor: { kind: 'point', x: 0, y: 0, width: 1, height: 1 },
  content: { kind: 'foreign', label: 'x' },
});

const picture = (id: string, media: string): SheetDrawing => ({
  ...drawing(id, id),
  content: { kind: 'picture', media, type: 'image/png', bytes: new Uint8Array([1, 2, 3]) },
});

const layoutWith = (patch: Partial<SheetLayout>): SheetLayout => ({ ...EMPTY_LAYOUT, ...patch });

const wide = (size: number): LineLayout => ({ ...LINE, size });

const namesOf = (layout: SheetLayout): readonly string[] =>
  layout.drawings.map((item) => item.name);

describe('rebasing workbook steps', () => {
  it.each(SCENARIOS)('%s', (_what, step, change, after) => {
    const rebased = rebaseStep(step, change);

    expect({ step: rebased }).toMatchObject({ step: after });
  });

  it.each([
    ['a renamed table', TABLE_RENAMED, 'SUM(People[a])', 'SUM(Staff[a])'],
    ['moved lines', lines('S', 'rows', 0, 2), 'S!A1', 'S!A3'],
  ])('rewrites a formula for %s', (_what, change, formula, printed) => {
    const rebased = rebaseStep(formulaStep(`=${formula}`), change);

    expect(printedAfter(rebased)).toBe(printed);
  });

  it('rewrites the formula of a name', () => {
    const step: WorkbookStep = { kind: 'setName', name: 'n', ast: astOf('=S!A1') };

    const rebased = rebaseStep(step, lines('S', 'rows', 0, 2));

    expect(rebased).toMatchObject({ ast: astOf('=S!A3') });
  });

  it('keeps the steps of a batch that survive', () => {
    const step: WorkbookStep = {
      kind: 'batch',
      steps: [
        { kind: 'setCells', sheet: 'S', cells: [{ row: 1, col: 0, format: '0' }] },
        { kind: 'addSheet', name: 'N', index: 0 },
      ],
    };

    const rebased = rebaseStep(step, REMOVED_ROWS);

    expect(rebased).toEqual({ kind: 'batch', steps: [{ kind: 'addSheet', name: 'N', index: 0 }] });
  });

  it('drops a batch with nothing left', () => {
    const step: WorkbookStep = {
      kind: 'batch',
      steps: [{ kind: 'setCells', sheet: 'S', cells: [{ row: 1, col: 0, format: '0' }] }],
    };

    const rebased = rebaseStep(step, REMOVED_ROWS);

    expect(rebased).toBeUndefined();
  });
});

describe('remote changes', () => {
  it('reads changes from nested batches', () => {
    const changes = changesOf({
      kind: 'batch',
      steps: [
        { kind: 'insertLines', sheet: 'S', axis: 'rows', at: 1, count: 2 },
        { kind: 'deleteLines', sheet: 'S', axis: 'rows', at: 1, count: 2 },
        { kind: 'renameSheet', from: 'S', to: 'T' },
        { kind: 'removeSheet', name: 'T' },
        { kind: 'renameTable', from: 'People', to: 'Staff' },
        { kind: 'addSheet', name: 'N', index: 0 },
      ],
    });

    expect(changes).toEqual([INSERTED, REMOVED_ROWS, TABLE_RENAMED]);
  });

  it.each([
    [
      'an insertion past an insertion',
      lines('S', 'rows', 5, 1),
      INSERTED,
      lines('S', 'rows', 7, 1),
    ],
    [
      'an insertion inside a deletion',
      lines('S', 'rows', 2, 1),
      REMOVED_ROWS,
      lines('S', 'rows', 1, 1),
    ],
    [
      'a deletion past an insertion',
      lines('S', 'rows', 5, -2),
      INSERTED,
      lines('S', 'rows', 7, -2),
    ],
    ['a change on another sheet', OTHER_SHEET, INSERTED, OTHER_SHEET],
    ['a change on another axis', COLUMNS, INSERTED, COLUMNS],
    ['a table rename', TABLE_RENAMED, INSERTED, TABLE_RENAMED],
  ])('moves %s', (_what, change, local, after) => {
    const moved = changeOver(change, local);

    expect(moved).toEqual(after);
  });

  it('forgets a deletion of lines already gone', () => {
    const moved = changeOver(lines('S', 'rows', 1, -2), REMOVED_ROWS);

    expect(moved).toBeUndefined();
  });
});

describe('merging layouts', () => {
  it('takes the own line where it changed and theirs elsewhere', () => {
    const merged = mergeLayouts(
      layoutWith({ cols: lineLayoutsOf([[1, LINE]]) }),
      layoutWith({ cols: lineLayoutsOf([[1, { ...LINE, size: 40 }]]) }),
      layoutWith({
        cols: lineLayoutsOf([
          [1, LINE],
          [2, { ...LINE, size: 60 }],
        ]),
      }),
    );

    expect([merged.cols.get(1)?.size, merged.cols.get(2)?.size]).toEqual([40, 60]);
  });

  it('removes a line the own side removed', () => {
    const merged = mergeLayouts(
      layoutWith({ rows: lineLayoutsOf([[1, LINE]]) }),
      layoutWith({}),
      layoutWith({ rows: lineLayoutsOf([[1, LINE]]) }),
    );

    expect(merged.rows.get(1)).toBeUndefined();
  });

  it('merges the view by key', () => {
    const view = EMPTY_LAYOUT.view;

    const merged = mergeLayouts(
      layoutWith({}),
      layoutWith({ view: { ...view, frozenRows: 2 } }),
      layoutWith({ view: { ...view, zoom: 150 } }),
    );

    expect(merged.view).toEqual({ ...view, frozenRows: 2, zoom: 150 });
  });

  it('keeps merges of the side that changed them', () => {
    const merges = [RANGE];

    const merged = mergeLayouts(layoutWith({}), layoutWith({}), layoutWith({ merges }));

    expect(merged.merges).toEqual(merges);
  });

  it('merges drawings by id', () => {
    const merged = mergeLayouts(
      layoutWith({ drawings: [drawing('a', 'a'), drawing('b', 'b'), drawing('c', 'c')] }),
      layoutWith({ drawings: [drawing('a', 'mine'), drawing('c', 'c'), drawing('d', 'new')] }),
      layoutWith({ drawings: [drawing('a', 'a'), drawing('b', 'b'), drawing('c', 'theirs')] }),
    );

    expect(namesOf(merged)).toEqual(['mine', 'theirs', 'new']);
  });

  it('compares pictures by media and not by bytes', () => {
    const base = layoutWith({ drawings: [picture('a', 'one.png')] });

    const merged = mergeLayouts(base, base, layoutWith({ drawings: [picture('a', 'two.png')] }));

    expect(merged.drawings[0]?.content).toMatchObject({ media: 'two.png' });
  });
});

describe('patching layouts', () => {
  it('puts the own lines back and leaves the lines set since', () => {
    const patched = patchLayout(
      layoutWith({ cols: lineLayoutsOf([[1, wide(40)]]) }),
      layoutWith({ cols: lineLayoutsOf([[1, LINE]]) }),
      layoutWith({
        cols: lineLayoutsOf([
          [1, wide(40)],
          [2, wide(60)],
        ]),
      }),
    );

    expect([patched.cols.get(1)?.size, patched.cols.get(2)?.size]).toEqual([20, 60]);
  });

  it('leaves a line, a view key and a drawing someone else has changed again', () => {
    const view = EMPTY_LAYOUT.view;

    const patched = patchLayout(
      layoutWith({
        cols: lineLayoutsOf([[1, wide(40)]]),
        view: { ...view, frozenRows: 2, zoom: 150 },
        drawings: [drawing('a', 'placed'), drawing('b', 'placed')],
      }),
      layoutWith({ drawings: [drawing('a', 'a'), drawing('b', 'b')] }),
      layoutWith({
        cols: lineLayoutsOf([[1, wide(70)]]),
        view: { ...view, frozenRows: 2, zoom: 80 },
        drawings: [drawing('a', 'placed'), drawing('b', 'theirs')],
      }),
    );

    expect(patched.cols.get(1)?.size).toBe(70);
    expect(patched.view).toEqual({ ...view, frozenRows: 0, zoom: 80 });
    expect(namesOf(patched)).toEqual(['a', 'theirs']);
  });

  it('finds no difference between layouts that hold the same', () => {
    const layout = layoutWith({ cols: lineLayoutsOf([[1, LINE]]), merges: [RANGE] });

    const delta = layoutDelta(
      layout,
      layoutWith({ cols: lineLayoutsOf([[1, { ...LINE }]]), merges: [{ ...RANGE }] }),
    );

    expect(delta).toBeUndefined();
  });

  it.each<readonly [string, Partial<LineLayout>]>([
    ['size', { size: 40 }],
    ['custom flag', { custom: false }],
    ['hidden flag', { hidden: true }],
    ['level', { level: 2 }],
    ['collapsed flag', { collapsed: true }],
    ['style', { style: { format: 1, decoration: 0 } }],
    ['extra attributes', { extra: [['ph', '1']] }],
  ])('tells lines apart by their %s', (_what, change) => {
    const delta = layoutDelta(
      layoutWith({ rows: lineLayoutsOf([[1, LINE]]) }),
      layoutWith({ rows: lineLayoutsOf([[1, { ...LINE, ...change }]]) }),
    );

    expect(delta?.layout.rows.get(1)).toMatchObject(change);
  });

  it('keeps in a difference only the lines and the parts that differ', () => {
    const rows = lineLayoutsOf([
      [1, LINE],
      [2, LINE],
    ]);

    const delta = layoutDelta(
      layoutWith({
        rows,
        cols: lineLayoutsOf([[3, wide(40)]]),
        merges: [RANGE],
        drawings: [drawing('a', 'a'), drawing('b', 'placed')],
      }),
      layoutWith({
        rows,
        cols: lineLayoutsOf([[4, wide(60)]]),
        merges: [RANGE],
        drawings: [drawing('a', 'a'), drawing('b', 'b')],
      }),
    );

    expect([delta?.base.rows.size, delta?.layout.rows.size]).toEqual([0, 0]);
    expect([delta?.base.cols.get(3)?.size, delta?.layout.cols.get(4)?.size]).toEqual([40, 60]);
    expect([delta?.base.merges, delta?.layout.merges]).toEqual([[], []]);

    expect([delta?.base.drawings, delta?.layout.drawings].map((list) => list?.length)).toEqual([
      1, 1,
    ]);
  });

  it('gives the same layout from a difference as from the whole layouts', () => {
    const base = layoutWith({
      cols: lineLayoutsOf([
        [1, wide(40)],
        [5, LINE],
      ]),
      merges: [RANGE],
    });

    const mine = layoutWith({ cols: lineLayoutsOf([[5, LINE]]), merges: [MOVED_RANGE] });

    const theirs = layoutWith({
      cols: lineLayoutsOf([
        [1, wide(40)],
        [5, wide(90)],
      ]),
      merges: [RANGE],
    });

    const delta = layoutDelta(base, mine) ?? { base, layout: mine };
    const patched = patchLayout(delta.base, delta.layout, theirs);
    const whole = patchLayout(base, mine, theirs);

    expect([patched.cols.get(1), patched.cols.get(5)?.size, patched.merges]).toEqual([
      undefined,
      90,
      [MOVED_RANGE],
    ]);

    expect(layoutDelta(patched, whole)).toBeUndefined();
  });

  it('keeps the last of two layouts given for one line', () => {
    const kept = lineLayoutsOf([
      [3, wide(60)],
      [1, wide(40)],
      [1, wide(50)],
    ]);

    expect([kept.size, kept.get(1)?.size, kept.get(3)?.size]).toEqual([2, 50, 60]);
  });

  it('moves the base of a step with its layout', () => {
    const frozen = layoutWith({ view: { ...EMPTY_LAYOUT.view, frozenRows: 3 } });

    const moved = rebaseStep(
      { kind: 'setLayout', sheet: 'S', layout: EMPTY_LAYOUT, base: frozen },
      INSERTED,
    );

    expect(moved).toMatchObject({ base: { view: { frozenRows: 5 } } });
  });
});
