import { describe, expect, it } from 'vite-plus/test';
import {
  DrawingAnchorKind,
  DrawingKind,
  DrawingPlacement,
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  StepKind,
  chartAnchorAt,
  createStepper,
  insertDrawing,
  placeDrawing,
  printFormula,
  removeDrawing,
  type DrawingAnchor,
  type FormulaNode,
  type SheetChart,
  type SheetDrawing,
  type SheetLayout,
} from '../src/core';
import { readWorkbook, writeWorkbook } from '../src/xlsx';
import { SALES_SHEET, xlsxPackage } from './xlsx-package';

interface DrawnBook {
  readonly drawings: readonly SheetDrawing[];
  readonly apply: ReturnType<typeof createStepper>;
  readonly place: (id: string, anchor: DrawingAnchor) => void;
  readonly remove: (id: string) => void;
  readonly insert: (drawing: SheetDrawing) => void;
  readonly layout: () => SheetLayout;
  readonly saved: () => Promise<readonly SheetDrawing[]>;
}

const OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const PACKAGE = 'http://schemas.openxmlformats.org/package/2006/relationships';

const SPREADSHEET_DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';

const DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/main';

const CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart';

const MARKUP = 'http://schemas.openxmlformats.org/markup-compatibility/2006';

const mark = (col: number, row: number, colOff = 0, rowOff = 0): string =>
  `<xdr:col>${String(col)}</xdr:col><xdr:colOff>${String(colOff)}</xdr:colOff><xdr:row>${String(row)}</xdr:row><xdr:rowOff>${String(rowOff)}</xdr:rowOff>`;

const frame = (id: number, name: string, relation: string): string =>
  `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${String(id)}" name="${name}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm/><a:graphic><a:graphicData uri="${CHART}"><c:chart r:id="${relation}"/></a:graphicData></a:graphic></xdr:graphicFrame>`;

const DRAWING_PART = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="${SPREADSHEET_DRAWING}" xmlns:a="${DRAWING}" xmlns:c="${CHART}" xmlns:r="${OFFICE}" xmlns:mc="${MARKUP}"><xdr:oneCellAnchor><xdr:from>${mark(3, 1, 9525, 19050)}</xdr:from><xdr:ext cx="952500" cy="476250"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo" descr="Company logo"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/></xdr:blipFill><xdr:spPr/></xdr:pic><xdr:clientData/></xdr:oneCellAnchor><xdr:twoCellAnchor><xdr:from>${mark(0, 6)}</xdr:from><xdr:to>${mark(4, 12)}</xdr:to>${frame(3, 'Sales chart', 'rId2')}<xdr:clientData/></xdr:twoCellAnchor><xdr:twoCellAnchor editAs="oneCell"><xdr:from>${mark(5, 2)}</xdr:from><xdr:to>${mark(8, 6)}</xdr:to><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="4" name="Note"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr/></xdr:sp><xdr:clientData/></xdr:twoCellAnchor><xdr:absoluteAnchor><xdr:pos x="190500" y="95250"/><xdr:ext cx="1905000" cy="952500"/>${frame(5, 'Mixed', 'rId3')}<xdr:clientData/></xdr:absoluteAnchor><mc:AlternateContent><mc:Choice Requires="cx1"><xdr:twoCellAnchor editAs="absolute"><xdr:from>${mark(10, 0)}</xdr:from><xdr:to>${mark(14, 4)}</xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="6" name="Waterfall"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/drawing/2014/chartex"><cx:chart xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" r:id="rId4"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></mc:Choice><mc:Fallback><xdr:twoCellAnchor><xdr:from>${mark(10, 0)}</xdr:from><xdr:to>${mark(14, 4)}</xdr:to><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="7" name="Fallback"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr/></xdr:sp><xdr:clientData/></xdr:twoCellAnchor></mc:Fallback></mc:AlternateContent></xdr:wsDr>`;

const series = (index: number, name: string, values: string): string =>
  `<c:ser><c:idx val="${String(index)}"/><c:order val="${String(index)}"/><c:tx><c:strRef><c:f>${name}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Cached</c:v></c:pt></c:strCache></c:strRef></c:tx><c:cat><c:strRef><c:f>Sales!$A$2:$A$4</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${values}</c:f></c:numRef></c:val></c:ser>`;

const COLUMN_CHART = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${CHART}" xmlns:a="${DRAWING}"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>Sales </a:t></a:r><a:r><a:t>by item</a:t></a:r></a:p></c:rich></c:tx></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:barChart><c:barDir val="col"/><c:grouping val="stacked"/>${series(0, 'Sales!$B$1', 'Sales!$B$2:$B$4')}${series(1, 'Sales!$D$1', 'Sales!$D$2:$D$4')}<c:overlap val="100"/></c:barChart><c:catAx><c:title><c:tx><c:rich><a:p><a:r><a:t>Axis</a:t></a:r></a:p></c:rich></c:tx></c:title></c:catAx></c:plotArea><c:legend><c:legendPos val="b"/></c:legend><c:dispBlanksAs val="span"/></c:chart></c:chartSpace>`;

const COMBO_CHART = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${CHART}"><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:barChart><c:barDir val="bar"/></c:barChart><c:lineChart/></c:plotArea></c:chart></c:chartSpace>`;

const DRAWING_RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PACKAGE}"><Relationship Id="rId1" Type="${OFFICE}/image" Target="../media/image1.png"/><Relationship Id="rId2" Type="${OFFICE}/chart" Target="../charts/chart1.xml"/><Relationship Id="rId3" Type="${OFFICE}/chart" Target="../charts/chart2.xml"/><Relationship Id="rId4" Type="http://schemas.microsoft.com/office/2014/relationships/chartEx" Target="../charts/chartEx1.xml"/></Relationships>`;

const SHEET_RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PACKAGE}"><Relationship Id="rId1" Type="${OFFICE}/table" Target="../tables/table1.xml"/><Relationship Id="rId2" Type="${OFFICE}/hyperlink" Target="https://example.com/" TargetMode="External"/><Relationship Id="rId3" Type="${OFFICE}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;

const PICTURE = 'not really a png';

const drawingsOf = async (
  changes: Readonly<Record<string, string | undefined>> = {},
): Promise<DrawnBook> => {
  const read = await readWorkbook(
    await xlsxPackage({
      'xl/worksheets/sheet1.xml': SALES_SHEET.replace(
        '<tableParts',
        '<drawing r:id="rId3"/><tableParts',
      ),
      'xl/worksheets/_rels/sheet1.xml.rels': SHEET_RELATIONSHIPS,
      'xl/drawings/drawing1.xml': DRAWING_PART,
      'xl/drawings/_rels/drawing1.xml.rels': DRAWING_RELATIONSHIPS,
      'xl/media/image1.png': PICTURE,
      'xl/charts/chart1.xml': COLUMN_CHART,
      'xl/charts/chart2.xml': COMBO_CHART,
      'xl/charts/chartEx1.xml': '<cx:chartSpace/>',
      ...changes,
    }),
  );

  if (read.kind === 'rejected') {
    throw new Error(`the package was rejected: ${read.reason}`);
  }

  const sheet = read.book.sheet('Sales');

  if (sheet === undefined) {
    throw new Error('Sales is missing');
  }
  return {
    get drawings() {
      return sheet.layout.drawings;
    },
    apply: createStepper(read.book, read.calculator),
    place: (id, anchor) => {
      sheet.layout = placeDrawing(sheet.layout, id, anchor);
    },
    remove: (id) => {
      sheet.layout = removeDrawing(sheet.layout, id);
    },
    insert: (drawing) => {
      sheet.layout = insertDrawing(sheet.layout, drawing);
    },
    layout: () => sheet.layout,
    saved: async () => {
      const written = await writeWorkbook(read.book, read.calculator, { source: read.source });

      if (!written.ok) {
        throw new Error('the workbook was refused');
      }

      const again = await readWorkbook(written.bytes);

      if (again.kind === 'rejected') {
        throw new Error('the written package was rejected');
      }
      return again.book.sheet('Sales')?.layout.drawings ?? [];
    },
  };
};

const formula = (node: FormulaNode | string | undefined): string | undefined =>
  node === undefined || typeof node === 'string' ? node : printFormula(node);

const chartOf = (drawing: SheetDrawing | undefined): SheetChart => {
  if (drawing?.content.kind !== DrawingKind.Chart) {
    throw new Error('the drawing is not a chart');
  }
  return drawing.content.chart;
};

const seriesTexts = (chart: SheetChart) =>
  chart.series.map((entry) => ({
    name: formula(entry.name),
    categories: formula(entry.categories),
    values: formula(entry.values),
  }));

describe('sheet drawings', () => {
  it('reads pictures, charts and foreign shapes with their anchors in pixels', async () => {
    const { drawings } = await drawingsOf();

    expect(drawings.map((drawing) => [drawing.id, drawing.name, drawing.content.kind])).toEqual([
      ['xl/drawings/drawing1.xml#2', 'Logo', DrawingKind.Picture],
      ['xl/drawings/drawing1.xml#3', 'Sales chart', DrawingKind.Chart],
      ['xl/drawings/drawing1.xml#4', 'Note', DrawingKind.Foreign],
      ['xl/drawings/drawing1.xml#5', 'Mixed', DrawingKind.Foreign],
      ['xl/drawings/drawing1.xml#6', 'Waterfall', DrawingKind.Foreign],
    ]);

    expect(drawings.map((drawing) => drawing.anchor)).toEqual([
      {
        kind: DrawingAnchorKind.Cell,
        from: { row: 1, col: 3, dx: 1, dy: 2 },
        width: 100,
        height: 50,
      },
      {
        kind: DrawingAnchorKind.Cells,
        placement: DrawingPlacement.TwoCell,
        from: { row: 6, col: 0, dx: 0, dy: 0 },
        to: { row: 12, col: 4, dx: 0, dy: 0 },
      },
      {
        kind: DrawingAnchorKind.Cells,
        placement: DrawingPlacement.OneCell,
        from: { row: 2, col: 5, dx: 0, dy: 0 },
        to: { row: 6, col: 8, dx: 0, dy: 0 },
      },
      { kind: DrawingAnchorKind.Point, x: 20, y: 10, width: 200, height: 100 },
      {
        kind: DrawingAnchorKind.Cells,
        placement: DrawingPlacement.Absolute,
        from: { row: 0, col: 10, dx: 0, dy: 0 },
        to: { row: 4, col: 14, dx: 0, dy: 0 },
      },
    ]);

    const [picture] = drawings;

    expect(picture?.alt).toBe('Company logo');

    expect(
      picture?.content.kind === DrawingKind.Picture && {
        media: picture.content.media,
        type: picture.content.type,
        text: new TextDecoder().decode(picture.content.bytes),
      },
    ).toEqual({ media: 'xl/media/image1.png', type: 'image/png', text: PICTURE });
  });

  it('reads the kind, title, legend, stacking, gaps and series formulas of a chart', async () => {
    const { drawings } = await drawingsOf();
    const chart = chartOf(drawings[1]);

    expect({ ...chart, series: seriesTexts(chart) }).toEqual({
      kind: SheetChartKind.Column,
      title: 'Sales by item',
      legend: true,
      stacking: SheetChartStacking.Stacked,
      gaps: SheetChartGaps.Connect,
      hole: undefined,
      series: [
        { name: 'Sales!$B$1', categories: 'Sales!$A$2:$A$4', values: 'Sales!$B$2:$B$4' },
        { name: 'Sales!$D$1', categories: 'Sales!$A$2:$A$4', values: 'Sales!$D$2:$D$4' },
      ],
    });
  });

  it('labels combined plots, shapes and chartEx frames instead of reading them', async () => {
    const { drawings } = await drawingsOf();

    expect(
      drawings.map((drawing) =>
        drawing.content.kind === DrawingKind.Foreign ? drawing.content.label : undefined,
      ),
    ).toEqual([undefined, undefined, 'sp', 'combo', 'chartEx']);
  });

  it('reads bars, doughnuts, scatter plots and literal series names', async () => {
    const doughnut = `<?xml version="1.0"?><c:chartSpace xmlns:c="${CHART}"><c:chart><c:plotArea><c:doughnutChart><c:ser><c:tx><c:v>Share</c:v></c:tx><c:val><c:numRef><c:f>Sales!$B$2:$B$4</c:f></c:numRef></c:val></c:ser><c:holeSize val="75"/></c:doughnutChart></c:plotArea></c:chart></c:chartSpace>`;

    const scatter = `<?xml version="1.0"?><c:chartSpace xmlns:c="${CHART}"><c:chart><c:plotArea><c:scatterChart><c:ser><c:xVal><c:numRef><c:f>Sales!$B$2:$B$4</c:f></c:numRef></c:xVal><c:yVal><c:numRef><c:f>Sales!$D$2:$D$4</c:f></c:numRef></c:yVal></c:ser></c:scatterChart></c:plotArea><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;

    const { drawings } = await drawingsOf({
      'xl/charts/chart1.xml': doughnut,
      'xl/charts/chart2.xml': scatter,
    });

    const ring = chartOf(drawings[1]);

    expect([ring.kind, ring.hole, ring.legend, ring.title, seriesTexts(ring)]).toEqual([
      SheetChartKind.Doughnut,
      0.75,
      false,
      undefined,
      [{ name: 'Share', categories: undefined, values: 'Sales!$B$2:$B$4' }],
    ]);

    const points = chartOf(drawings[3]);

    expect([points.kind, points.gaps, seriesTexts(points)]).toEqual([
      SheetChartKind.Scatter,
      SheetChartGaps.Break,
      [{ name: undefined, categories: 'Sales!$B$2:$B$4', values: 'Sales!$D$2:$D$4' }],
    ]);
  });

  it('keeps a picture without readable bytes as a foreign drawing', async () => {
    const { drawings } = await drawingsOf({ 'xl/media/image1.png': undefined });

    expect(drawings[0]?.content).toEqual({ kind: DrawingKind.Foreign, label: 'picture' });
  });

  it('moves anchors and series with inserted and deleted rows and undoes the move', async () => {
    const book = await drawingsOf();
    const before = book.drawings;

    const inserted = book.apply.apply({
      kind: 'insertLines',
      sheet: 'Sales',
      axis: 'rows',
      at: 3,
      count: 2,
    });

    expect(book.drawings.map((drawing) => drawing.anchor)).toEqual([
      before[0]?.anchor,
      {
        kind: DrawingAnchorKind.Cells,
        placement: DrawingPlacement.TwoCell,
        from: { row: 8, col: 0, dx: 0, dy: 0 },
        to: { row: 14, col: 4, dx: 0, dy: 0 },
      },
      {
        kind: DrawingAnchorKind.Cells,
        placement: DrawingPlacement.OneCell,
        from: { row: 2, col: 5, dx: 0, dy: 0 },
        to: { row: 6, col: 8, dx: 0, dy: 0 },
      },
      before[3]?.anchor,
      before[4]?.anchor,
    ]);

    expect(seriesTexts(chartOf(book.drawings[1])).map((entry) => entry.values)).toEqual([
      'Sales!$B$2:$B$6',
      'Sales!$D$2:$D$6',
    ]);

    expect(inserted.ok && book.apply.apply(inserted.inverse).ok).toBe(true);

    expect(book.drawings.map((drawing) => drawing.anchor)).toEqual(
      before.map((drawing) => drawing.anchor),
    );

    book.apply.apply({ kind: 'deleteLines', sheet: 'Sales', axis: 'rows', at: 0, count: 4 });

    expect(book.drawings.map((drawing) => drawing.anchor).slice(0, 3)).toEqual([
      {
        kind: DrawingAnchorKind.Cell,
        from: { row: 0, col: 3, dx: 1, dy: 2 },
        width: 100,
        height: 50,
      },
      {
        kind: DrawingAnchorKind.Cells,
        placement: DrawingPlacement.TwoCell,
        from: { row: 2, col: 0, dx: 0, dy: 0 },
        to: { row: 8, col: 4, dx: 0, dy: 0 },
      },
      {
        kind: DrawingAnchorKind.Cells,
        placement: DrawingPlacement.OneCell,
        from: { row: 0, col: 5, dx: 0, dy: 0 },
        to: { row: 4, col: 8, dx: 0, dy: 0 },
      },
    ]);
  });

  it('writes moved and resized anchors into the drawing part', async () => {
    const book = await drawingsOf();

    const picture: DrawingAnchor = {
      kind: DrawingAnchorKind.Cell,
      from: { row: 4, col: 6, dx: 3, dy: 5 },
      width: 80,
      height: 40,
    };

    const chart: DrawingAnchor = {
      kind: DrawingAnchorKind.Cells,
      placement: DrawingPlacement.TwoCell,
      from: { row: 20, col: 1, dx: 2, dy: 4 },
      to: { row: 30, col: 5, dx: 6, dy: 8 },
    };

    const point: DrawingAnchor = {
      kind: DrawingAnchorKind.Point,
      x: 40,
      y: 60,
      width: 120,
      height: 90,
    };

    book.place('xl/drawings/drawing1.xml#2', picture);
    book.place('xl/drawings/drawing1.xml#3', chart);
    book.place('xl/drawings/drawing1.xml#5', point);

    const saved = await book.saved();

    expect(saved.map((drawing) => drawing.anchor).slice(0, 4)).toEqual([
      picture,
      chart,
      book.drawings[2]?.anchor,
      point,
    ]);
  });

  it('moves an anchor kept in place by editAs absolute and keeps it on row insertion', async () => {
    const book = await drawingsOf();

    const moved: DrawingAnchor = {
      kind: DrawingAnchorKind.Cells,
      placement: DrawingPlacement.Absolute,
      from: { row: 2, col: 11, dx: 0, dy: 0 },
      to: { row: 6, col: 15, dx: 0, dy: 0 },
    };

    book.place('xl/drawings/drawing1.xml#6', moved);

    const saved = await book.saved();

    book.apply.apply({ kind: 'insertLines', sheet: 'Sales', axis: 'rows', at: 0, count: 1 });

    expect([saved[4]?.anchor, book.drawings[4]?.anchor]).toEqual([moved, moved]);
  });

  it('removes a drawing from the part and keeps editing the ones after it', async () => {
    const book = await drawingsOf();

    const point: DrawingAnchor = {
      kind: DrawingAnchorKind.Point,
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    };

    book.remove('xl/drawings/drawing1.xml#4');
    book.place('xl/drawings/drawing1.xml#5', point);

    const saved = await book.saved();

    expect(saved.map((drawing) => [drawing.name, drawing.anchor.kind])).toEqual([
      ['Logo', DrawingAnchorKind.Cell],
      ['Sales chart', DrawingAnchorKind.Cells],
      ['Mixed', DrawingAnchorKind.Point],
      ['Waterfall', DrawingAnchorKind.Cells],
    ]);

    expect(saved[2]?.anchor).toEqual(point);
  });

  it('undoes a placement through the layout step and writes the original part', async () => {
    const book = await drawingsOf();
    const before = book.layout();

    const placed = book.apply.apply({
      kind: StepKind.SetLayout,
      sheet: 'Sales',
      layout: placeDrawing(before, 'xl/drawings/drawing1.xml#2', {
        kind: DrawingAnchorKind.Cell,
        from: { row: 9, col: 9, dx: 0, dy: 0 },
        width: 10,
        height: 10,
      }),
    });

    expect(placed.ok && book.apply.apply(placed.inverse).ok).toBe(true);

    expect([book.layout() === before, (await book.saved())[0]?.anchor]).toEqual([
      true,
      before.drawings[0]?.anchor,
    ]);
  });

  it('renames sheets inside series formulas', async () => {
    const book = await drawingsOf();

    book.apply.apply({ kind: 'renameSheet', from: 'Sales', to: 'Revenue' });

    expect(seriesTexts(chartOf(book.drawings[1]))[0]).toEqual({
      name: 'Revenue!$B$1',
      categories: 'Revenue!$A$2:$A$4',
      values: 'Revenue!$B$2:$B$4',
    });
  });

  it('adds a new chart to the drawing part and keeps what was there', async () => {
    const book = await drawingsOf();
    const before = book.drawings.map((drawing) => drawing.name);
    const chart = chartOf(book.drawings[1]);

    book.insert({
      id: 'new-1',
      name: 'Added',
      alt: '',
      anchor: chartAnchorAt(20, 2),
      content: { kind: DrawingKind.Chart, chart },
    });

    const saved = await book.saved();

    expect(saved.map((drawing) => drawing.name)).toEqual([...before, 'Added']);

    expect([saved.at(-1)?.anchor, chartOf(saved.at(-1)).series.length]).toEqual([
      chartAnchorAt(20, 2),
      chart.series.length,
    ]);
  });
});
