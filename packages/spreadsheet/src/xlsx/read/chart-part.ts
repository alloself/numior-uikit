import {
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  type SheetChart,
  type SheetChartSeries,
} from '../../core/drawings/drawing.types';
import type { FormulaNode } from '../../core/formula/formula.types';
import { OoxmlAttribute, OoxmlElement } from '../ooxml.types';
import type { XmlAttribute, XmlName } from '../xml/xml.types';
import type { ZipArchive } from '../zip/zip.types';
import { XlsxPartError, attributeOf, numberOf, readPart, type PartOptions } from './ooxml';
import { parseFileFormula } from './file-formula';

export type ChartReading =
  | { readonly ok: true; readonly chart: SheetChart }
  | { readonly ok: false; readonly label: string };

type SeriesField = (typeof SeriesField)[keyof typeof SeriesField];

type Capture = (typeof Capture)[keyof typeof Capture];

interface SeriesDraft {
  name: FormulaNode | string | undefined;
  categories: FormulaNode | undefined;
  values: FormulaNode | undefined;
}

interface ChartDraft {
  readonly plots: string[];
  readonly series: SeriesDraft[];
  direction: string | undefined;
  grouping: string | undefined;
  hole: number | undefined;
  blanks: string | undefined;
  legend: boolean;
  title: string | undefined;
  titleDeleted: boolean;
}

const SeriesField = { Name: 'name', Categories: 'categories', Values: 'values' } as const;

const Capture = { Formula: 'formula', Value: 'value', Title: 'title' } as const;

const CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart';

const DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/main';

const BAR_DIRECTION = 'bar';

const SPAN_BLANKS = 'span';

const DEFAULT_HOLE = 50;

const PLOTS: ReadonlyMap<string, SheetChartKind | undefined> = new Map([
  [OoxmlElement.BarChart, undefined],
  [OoxmlElement.LineChart, SheetChartKind.Line],
  [OoxmlElement.AreaChart, SheetChartKind.Area],
  [OoxmlElement.PieChart, SheetChartKind.Pie],
  [OoxmlElement.DoughnutChart, SheetChartKind.Doughnut],
  [OoxmlElement.ScatterChart, SheetChartKind.Scatter],
]);

const FOREIGN_PLOTS = new Set([
  'bar3DChart',
  'line3DChart',
  'area3DChart',
  'pie3DChart',
  'ofPieChart',
  'radarChart',
  'stockChart',
  'surfaceChart',
  'surface3DChart',
  'bubbleChart',
]);

const SERIES_FIELDS: ReadonlyMap<string, SeriesField> = new Map([
  [OoxmlElement.Tx, SeriesField.Name],
  [OoxmlElement.Cat, SeriesField.Categories],
  [OoxmlElement.XVal, SeriesField.Categories],
  [OoxmlElement.Val, SeriesField.Values],
  [OoxmlElement.YVal, SeriesField.Values],
]);

const STACKINGS: ReadonlyMap<string | undefined, SheetChartStacking> = new Map([
  ['stacked', SheetChartStacking.Stacked],
  ['percentStacked', SheetChartStacking.Percent],
]);

const TRUE_VALUES = new Set(['1', 'true']);

const formulaOf = (text: string): FormulaNode | undefined => {
  const parsed = parseFileFormula(text.trim());

  return parsed.ok ? parsed.ast : undefined;
};

const kindOf = (draft: ChartDraft): SheetChartKind | undefined => {
  const [plot] = draft.plots;

  if (plot === OoxmlElement.BarChart) {
    return draft.direction === BAR_DIRECTION ? SheetChartKind.Bar : SheetChartKind.Column;
  }
  return plot === undefined ? undefined : PLOTS.get(plot);
};

const chartOf = (draft: ChartDraft): ChartReading => {
  const kind = kindOf(draft);

  if (draft.plots.length !== 1) {
    return { ok: false, label: draft.plots.length === 0 ? 'chart' : 'combo' };
  }
  if (kind === undefined) {
    return { ok: false, label: draft.plots[0] ?? 'chart' };
  }

  const series = draft.series.map((entry): SheetChartSeries => ({
    name: entry.name,
    categories: entry.categories,
    values: entry.values,
  }));

  return {
    ok: true,
    chart: {
      kind,
      title: draft.titleDeleted ? undefined : draft.title,
      legend: draft.legend,
      stacking: STACKINGS.get(draft.grouping) ?? SheetChartStacking.None,
      gaps: draft.blanks === SPAN_BLANKS ? SheetChartGaps.Connect : SheetChartGaps.Break,
      hole: kind === SheetChartKind.Doughnut ? (draft.hole ?? DEFAULT_HOLE) / 100 : undefined,
      series,
    },
  };
};

const valueOf = (attributes: readonly XmlAttribute[]): string | undefined =>
  attributeOf(attributes, OoxmlAttribute.Val);

const isTitleText = (name: XmlName): boolean =>
  name.uri === DRAWING && name.local === OoxmlElement.T;

const createChartDrafter = () => {
  const draft: ChartDraft = {
    plots: [],
    series: [],
    direction: undefined,
    grouping: undefined,
    hole: undefined,
    blanks: undefined,
    legend: false,
    title: undefined,
    titleDeleted: false,
  };

  let series: SeriesDraft | undefined;
  let seriesField: SeriesField | undefined;
  let inTitle = 0;
  let inPlotArea = 0;
  let capture: Capture | undefined;
  let text = '';

  const startCapture = (next: Capture): void => {
    capture = next;
    text = '';
  };

  const openSetting = (local: string, attributes: readonly XmlAttribute[]): boolean => {
    switch (local) {
      case OoxmlElement.AutoTitleDeleted:
        draft.titleDeleted = TRUE_VALUES.has(valueOf(attributes) ?? '');
        return true;
      case OoxmlElement.Legend:
        draft.legend = true;
        return true;
      case OoxmlElement.BarDir:
        draft.direction = valueOf(attributes);
        return true;
      case OoxmlElement.Grouping:
        draft.grouping = valueOf(attributes);
        return true;
      case OoxmlElement.HoleSize:
        draft.hole = numberOf(valueOf(attributes), DEFAULT_HOLE);
        return true;
      case OoxmlElement.DispBlanksAs:
        draft.blanks = valueOf(attributes);
        return true;
      default:
        return false;
    }
  };

  const openSeriesPart = (local: string): void => {
    switch (local) {
      case OoxmlElement.Ser:
        series = { name: undefined, categories: undefined, values: undefined };
        draft.series.push(series);
        return;
      case OoxmlElement.F:
        if (series !== undefined && seriesField !== undefined) {
          startCapture(Capture.Formula);
        }
        return;
      case OoxmlElement.V:
        if (series !== undefined && series.name === undefined && seriesField === SeriesField.Name) {
          startCapture(Capture.Value);
        }
        return;
      default:
        if (series !== undefined && inTitle === 0 && SERIES_FIELDS.has(local)) {
          seriesField = SERIES_FIELDS.get(local);
        }
    }
  };

  const openChart = (name: XmlName, attributes: readonly XmlAttribute[]): void => {
    if (PLOTS.has(name.local) || FOREIGN_PLOTS.has(name.local)) {
      draft.plots.push(name.local);
      return;
    }
    if (name.local === OoxmlElement.Title) {
      inTitle += 1;
      return;
    }
    if (name.local === OoxmlElement.PlotArea) {
      inPlotArea += 1;
      return;
    }
    if (openSetting(name.local, attributes)) {
      return;
    }

    openSeriesPart(name.local);
  };

  const closeCapture = (): void => {
    if (series !== undefined && capture === Capture.Formula && seriesField !== undefined) {
      series[seriesField] = formulaOf(text);
    } else if (series !== undefined && capture === Capture.Value) {
      series.name = text;
    }
    capture = undefined;
  };

  const closeChart = (name: XmlName): void => {
    switch (name.local) {
      case OoxmlElement.Title:
        inTitle -= 1;
        return;
      case OoxmlElement.PlotArea:
        inPlotArea -= 1;
        return;
      case OoxmlElement.Ser:
        series = undefined;
        seriesField = undefined;
        return;
      case OoxmlElement.F:
      case OoxmlElement.V:
        closeCapture();
        return;
      default:
        if (series !== undefined && SERIES_FIELDS.get(name.local) === seriesField) {
          seriesField = undefined;
        }
    }
  };

  return {
    open: (name: XmlName, attributes: readonly XmlAttribute[]): void => {
      if (name.uri === CHART) {
        openChart(name, attributes);
      } else if (isTitleText(name) && inTitle > 0 && inPlotArea === 0) {
        capture = Capture.Title;
      }
    },
    text: (chunk: string): void => {
      if (capture === Capture.Title) {
        draft.title = (draft.title ?? '') + chunk;
      } else if (capture !== undefined) {
        text += chunk;
      }
    },
    close: (name: XmlName): void => {
      if (name.uri === CHART) {
        closeChart(name);
      } else if (isTitleText(name) && capture === Capture.Title) {
        capture = undefined;
      }
    },
    result: (): ChartReading => chartOf(draft),
  };
};

export const readChartPart = async (
  archive: ZipArchive,
  path: string,
  options: PartOptions,
): Promise<ChartReading> => {
  const drafter = createChartDrafter();

  try {
    await readPart(archive, path, drafter, options);
  } catch (error) {
    if (error instanceof XlsxPartError) {
      return { ok: false, label: 'chart' };
    }
    throw error;
  }
  return drafter.result();
};
