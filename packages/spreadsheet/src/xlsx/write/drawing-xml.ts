import { emuOfPixels } from '../../core/drawings/drawings';
import {
  DrawingAnchorKind,
  DrawingPlacement,
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  type DrawingAnchor,
  type DrawingMark,
  type SheetChart,
  type SheetChartSeries,
  type SheetDrawing,
} from '../../core/drawings/drawing.types';
import type { FormulaNode } from '../../core/formula/formula.types';
import { printFormula } from '../../core/formula/printer';
import { escapeAttribute, escapeText } from '../xml/writer';

const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const SPREADSHEET_DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';

const DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/main';

const CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart';

const RELATIONSHIPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const CATEGORY_AXIS = 111;

const VALUE_AXIS = 222;

const AXIS_IDS = `<c:axId val="${String(CATEGORY_AXIS)}"/><c:axId val="${String(VALUE_AXIS)}"/>`;

const NAMESPACES = `xmlns:xdr="${SPREADSHEET_DRAWING}" xmlns:a="${DRAWING}" xmlns:r="${RELATIONSHIPS}"`;

const formulaXml = (node: FormulaNode): string => `<c:f>${escapeText(printFormula(node))}</c:f>`;

const nameXml = (name: SheetChartSeries['name']): string => {
  if (name === undefined) {
    return '';
  }
  return typeof name === 'string'
    ? `<c:tx><c:v>${escapeText(name)}</c:v></c:tx>`
    : `<c:tx><c:strRef>${formulaXml(name)}</c:strRef></c:tx>`;
};

const referenceXml = (tag: string, kind: string, node: FormulaNode | undefined): string =>
  node === undefined ? '' : `<c:${tag}><c:${kind}>${formulaXml(node)}</c:${kind}></c:${tag}>`;

const seriesHead = (series: SheetChartSeries, index: number): string =>
  `<c:idx val="${String(index)}"/><c:order val="${String(index)}"/>${nameXml(series.name)}`;

const plainSeries = (series: SheetChartSeries, index: number): string =>
  `<c:ser>${seriesHead(series, index)}${referenceXml('cat', 'strRef', series.categories)}${referenceXml('val', 'numRef', series.values)}</c:ser>`;

const dotSeries = (series: SheetChartSeries, index: number): string =>
  `<c:ser>${seriesHead(series, index)}<c:spPr><a:ln w="19050"><a:noFill/></a:ln></c:spPr>${referenceXml('xVal', 'numRef', series.categories)}${referenceXml('yVal', 'numRef', series.values)}</c:ser>`;

const groupingOf = (stacking: SheetChartStacking, plain: string): string => {
  switch (stacking) {
    case SheetChartStacking.None:
      return plain;
    case SheetChartStacking.Stacked:
      return 'stacked';
    case SheetChartStacking.Percent:
      return 'percentStacked';
  }
};

const axisXml = (tag: string, id: number, cross: number, position: string, extra: string): string =>
  `<c:${tag}><c:axId val="${String(id)}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${position}"/>${extra}<c:crossAx val="${String(cross)}"/><c:crosses val="autoZero"/></c:${tag}>`;

const GRID = '<c:majorGridlines/>';

const axesXml = (kind: SheetChartKind): string => {
  const sideways = kind === SheetChartKind.Bar;
  const first = kind === SheetChartKind.Scatter ? 'valAx' : 'catAx';

  return (
    axisXml(first, CATEGORY_AXIS, VALUE_AXIS, sideways ? 'l' : 'b', '') +
    axisXml('valAx', VALUE_AXIS, CATEGORY_AXIS, sideways ? 'b' : 'l', GRID)
  );
};

const barXml = (chart: SheetChart, series: string): string => {
  const direction = chart.kind === SheetChartKind.Bar ? 'bar' : 'col';
  const overlap = chart.stacking === SheetChartStacking.None ? '' : '<c:overlap val="100"/>';

  return `<c:barChart><c:barDir val="${direction}"/><c:grouping val="${groupingOf(chart.stacking, 'clustered')}"/><c:varyColors val="0"/>${series}<c:gapWidth val="150"/>${overlap}${AXIS_IDS}</c:barChart>`;
};

const plotXml = (chart: SheetChart, series: string): string => {
  const grouping = `<c:grouping val="${groupingOf(chart.stacking, 'standard')}"/>`;

  switch (chart.kind) {
    case SheetChartKind.Column:
    case SheetChartKind.Bar:
      return barXml(chart, series) + axesXml(chart.kind);
    case SheetChartKind.Line:
      return `<c:lineChart>${grouping}<c:varyColors val="0"/>${series}<c:marker val="1"/>${AXIS_IDS}</c:lineChart>${axesXml(chart.kind)}`;
    case SheetChartKind.Area:
      return `<c:areaChart>${grouping}<c:varyColors val="0"/>${series}${AXIS_IDS}</c:areaChart>${axesXml(chart.kind)}`;
    case SheetChartKind.Pie:
      return `<c:pieChart><c:varyColors val="1"/>${series}<c:firstSliceAng val="0"/></c:pieChart>`;
    case SheetChartKind.Doughnut:
      return `<c:doughnutChart><c:varyColors val="1"/>${series}<c:firstSliceAng val="0"/><c:holeSize val="${String(chart.hole ?? 50)}"/></c:doughnutChart>`;
    case SheetChartKind.Scatter:
      return `<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${series}${AXIS_IDS}</c:scatterChart>${axesXml(chart.kind)}`;
  }
};

const titleXml = (title: string | undefined): string =>
  title === undefined
    ? '<c:autoTitleDeleted val="1"/>'
    : `<c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>${escapeText(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`;

export const chartXml = (chart: SheetChart): string => {
  const write = chart.kind === SheetChartKind.Scatter ? dotSeries : plainSeries;
  const series = chart.series.map(write).join('');
  const blanks = chart.gaps === SheetChartGaps.Connect ? 'span' : 'gap';

  const legend = chart.legend
    ? '<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>'
    : '';

  return `${HEADER}<c:chartSpace xmlns:c="${CHART}" xmlns:a="${DRAWING}" xmlns:r="${RELATIONSHIPS}"><c:chart>${titleXml(chart.title)}<c:plotArea><c:layout/>${plotXml(chart, series)}</c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="${blanks}"/></c:chart></c:chartSpace>`;
};

const markXml = (tag: string, mark: DrawingMark): string =>
  `<xdr:${tag}><xdr:col>${String(mark.col)}</xdr:col><xdr:colOff>${String(emuOfPixels(mark.dx))}</xdr:colOff><xdr:row>${String(mark.row)}</xdr:row><xdr:rowOff>${String(emuOfPixels(mark.dy))}</xdr:rowOff></xdr:${tag}>`;

const extentXml = (width: number, height: number): string =>
  `<xdr:ext cx="${String(emuOfPixels(width))}" cy="${String(emuOfPixels(height))}"/>`;

const editAs = (placement: DrawingPlacement): string =>
  placement === DrawingPlacement.TwoCell ? '' : ` editAs="${placement}"`;

const wrapAnchor = (anchor: DrawingAnchor, content: string): string => {
  switch (anchor.kind) {
    case DrawingAnchorKind.Cells:
      return `<xdr:twoCellAnchor ${NAMESPACES}${editAs(anchor.placement)}>${markXml('from', anchor.from)}${markXml('to', anchor.to)}${content}<xdr:clientData/></xdr:twoCellAnchor>`;
    case DrawingAnchorKind.Cell:
      return `<xdr:oneCellAnchor ${NAMESPACES}>${markXml('from', anchor.from)}${extentXml(anchor.width, anchor.height)}${content}<xdr:clientData/></xdr:oneCellAnchor>`;
    case DrawingAnchorKind.Point:
      return `<xdr:absoluteAnchor ${NAMESPACES}><xdr:pos x="${String(emuOfPixels(anchor.x))}" y="${String(emuOfPixels(anchor.y))}"/>${extentXml(anchor.width, anchor.height)}${content}<xdr:clientData/></xdr:absoluteAnchor>`;
  }
};

export const chartAnchorXml = (
  anchor: DrawingAnchor,
  name: string,
  shape: number,
  relationship: string,
): string =>
  wrapAnchor(
    anchor,
    `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${String(shape)}" name="${escapeAttribute(name)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${CHART}"><c:chart xmlns:c="${CHART}" r:id="${relationship}"/></a:graphicData></a:graphic></xdr:graphicFrame>`,
  );

export const pictureAnchorXml = (
  drawing: Pick<SheetDrawing, 'anchor' | 'name' | 'alt'>,
  shape: number,
  relationship: string,
): string =>
  wrapAnchor(
    drawing.anchor,
    `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${String(shape)}" name="${escapeAttribute(drawing.name)}" descr="${escapeAttribute(drawing.alt)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${relationship}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>`,
  );

export const drawingXml = (anchors: string): string =>
  `${HEADER}<xdr:wsDr xmlns:xdr="${SPREADSHEET_DRAWING}" xmlns:a="${DRAWING}">${anchors}</xdr:wsDr>`;
