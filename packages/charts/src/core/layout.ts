import { max, min } from 'lodash-es';
import { layoutBars } from './bars';
import { layoutLines, stackedLineExtent } from './lines';
import { layoutSlices } from './pies';
import {
  ChartCategoriesKind,
  ChartGaps,
  ChartKind,
  ChartScale,
  ChartStacking,
  NumberStyle,
  SceneLineRole,
  SceneTextRole,
  type Box,
  type ChartScene,
  type ChartSeries,
  type ChartSize,
  type ChartSlot,
  type ChartSpec,
  type LayoutOptions,
  type SceneLine,
  type SceneText,
} from './chart.types';
import { estimateWidth, numberFormatter, numberStyle, timeFormatter, truncated } from './format';
import {
  bandScale,
  linearScale,
  logDomain,
  logScale,
  niceDomain,
  type BandScale,
  type NiceDomain,
} from './scales';
import { timeGrain } from './time';

interface CategoryLabel {
  readonly index: number;
  readonly text: string;
}

interface Frame {
  readonly spec: ChartSpec;
  readonly size: ChartSize;
  readonly rtl: boolean;
  readonly fontSize: number;
  readonly line: number;
  readonly measure: (text: string, fontSize: number) => number;
  readonly domain: NiceDomain;
  readonly log: boolean;
  readonly valueTexts: readonly string[];
  readonly count: number;
  readonly labels: readonly CategoryLabel[];
  readonly axis: NiceDomain | undefined;
  readonly axisTexts: readonly string[];
}

const PADDING = 4;

const TICK_GAP = 8;

const SLOTS: readonly ChartSlot[] = [1, 2, 3, 4, 5, 6, 7, 8];

const CATEGORY_SHARE = 0.4;

const MARKER_ROOM = 40;

const HOLE = 0.6;

const MOST_TICKS = 5;

const FEWEST_TICKS = 2;

const CLIP_SLACK = 1;

const ROUNDING = 1e-6;

const MOST_LABELS = 2000;

const slotsOf = (series: readonly ChartSeries[]): ChartSlot[] =>
  series.map((item, index) => item.slot ?? SLOTS[index] ?? 0);

const finite = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

const categoryCount = (spec: ChartSpec): number =>
  spec.categories.kind === ChartCategoriesKind.Text
    ? spec.categories.labels.length
    : spec.categories.values.length;

const extent = (values: readonly number[]): readonly [number, number] => [
  min(values) ?? 0,
  max(values) ?? 1,
];

const linear = (spec: ChartSpec): boolean =>
  spec.kind === ChartKind.Line || spec.kind === ChartKind.Area;

const pointAt = (spec: ChartSpec, band: BandScale): ((index: number) => number) => {
  if (
    !linear(spec) ||
    spec.categories.kind === ChartCategoriesKind.Text ||
    spec.categories.values.length < 2
  ) {
    return band.center;
  }

  const { values } = spec.categories;
  const [first, last] = extent(values);
  const position = linearScale([first, last], [band.center(0), band.center(values.length - 1)]);

  return (index) => position(values[index] ?? first);
};

const stackedExtent = (spec: ChartSpec, count: number): readonly [number, number] => {
  const sums = Array.from({ length: count }, (_unused, index) =>
    spec.series.reduce(
      (total, item) => {
        const value = item.values[index];

        if (!finite(value)) {
          return total;
        }
        return value > 0
          ? { positive: total.positive + value, negative: total.negative }
          : { positive: total.positive, negative: total.negative + value };
      },
      { positive: 0, negative: 0 },
    ),
  );

  return extent(sums.flatMap((sum) => [sum.positive, sum.negative]));
};

const positiveOr = (bound: number | undefined, fallback: number): number =>
  bound !== undefined && bound > 0 ? bound : fallback;

const positiveOnly = (series: ChartSeries): ChartSeries => ({
  ...series,
  values: series.values.map((value) => (finite(value) && value > 0 ? value : null)),
});

const valuesOf = (spec: ChartSpec): number[] =>
  spec.series.flatMap((item) => item.values.filter(finite));

const stackedOrPlain = (
  spec: ChartSpec,
  count: number,
  lines: boolean,
): readonly [number, number] => {
  if ((spec.stacking ?? 'none') === ChartStacking.None) {
    return extent(valuesOf(spec));
  }
  return lines ? extent(stackedLineExtent(spec, count)) : stackedExtent(spec, count);
};

const domainOf = (
  spec: ChartSpec,
  count: number,
  ticks: number,
): { domain: NiceDomain; log: boolean } => {
  const axis = spec.valueAxis ?? {};
  const stacking = spec.stacking ?? 'none';
  const lines = linear(spec);

  if (stacking === ChartStacking.Percent) {
    const [low] = lines ? extent(stackedLineExtent(spec, count)) : stackedExtent(spec, count);

    return {
      domain: niceDomain(low < 0 ? -1 : 0, 1, { min: low < 0 ? -1 : 0, max: 1, count: ticks }),
      log: false,
    };
  }

  const positive = valuesOf(spec).filter((value) => value > 0);

  if (axis.scale === ChartScale.Log && stacking === ChartStacking.None && positive.length > 0) {
    const [low, high] = extent(positive);

    return {
      domain: logDomain(positiveOr(axis.min, low), positiveOr(axis.max, high), ticks),
      log: true,
    };
  }

  const [low, high] = stackedOrPlain(spec, count, lines);

  return {
    domain: niceDomain(low, high, {
      zero: spec.kind !== ChartKind.Line && spec.kind !== ChartKind.Scatter,
      min: axis.min,
      max: axis.max,
      count: ticks,
    }),
    log: false,
  };
};

const categoryText = (
  spec: ChartSpec,
  options: LayoutOptions,
  locale: string,
): ((index: number) => string) => {
  if (spec.categories.kind === ChartCategoriesKind.Text) {
    const { labels } = spec.categories;

    return (index) => labels[index] ?? '';
  }

  const { values } = spec.categories;

  if (spec.categories.kind === ChartCategoriesKind.Number) {
    const plain = numberFormatter(locale, NumberStyle.Plain);

    return (index) => plain(values[index] ?? Number.NaN, 0);
  }

  const { unit, context } = timeGrain(values);
  const format = options.formatTime ?? timeFormatter(locale, context);

  return (index) => format(values[index] ?? Number.NaN, unit);
};

const categoryLabels = (count: number, text: (index: number) => string): CategoryLabel[] => {
  const stride = Math.max(1, Math.ceil(count / MOST_LABELS));

  return Array.from({ length: Math.ceil(count / stride) }, (_unused, place) => ({
    index: place * stride,
    text: text(place * stride),
  }));
};

const scatterAxis = (spec: ChartSpec, ticks: number): NiceDomain | undefined => {
  if (spec.kind !== ChartKind.Scatter || spec.categories.kind !== ChartCategoriesKind.Number) {
    return undefined;
  }

  const [low, high] = extent(spec.categories.values.filter(Number.isFinite));

  return niceDomain(low, high, { count: ticks });
};

const frameOf = (
  spec: ChartSpec,
  size: ChartSize,
  options: LayoutOptions,
  ticks: number,
): Frame => {
  const locale = options.locale ?? 'en';
  const fontSize = options.fontSize ?? 12;
  const count = categoryCount(spec);
  const { domain, log } = domainOf(spec, count, ticks);
  const largest = Math.max(Math.abs(domain.min), Math.abs(domain.max));

  const format =
    options.formatNumber ??
    numberFormatter(locale, numberStyle(largest, spec.stacking === ChartStacking.Percent));

  const axis = scatterAxis(spec, ticks);

  const axisFormat =
    options.formatNumber ??
    numberFormatter(
      locale,
      numberStyle(axis === undefined ? 0 : Math.max(Math.abs(axis.min), Math.abs(axis.max)), false),
    );

  return {
    spec: log ? { ...spec, series: spec.series.map(positiveOnly) } : spec,
    size,
    rtl: options.rtl ?? false,
    fontSize,
    line: Math.ceil(fontSize * 1.25),
    measure: options.measure ?? estimateWidth,
    domain,
    log,
    valueTexts: domain.ticks.map((tick) => format(tick, log ? tick : domain.step)),
    count,
    labels: categoryLabels(count, categoryText(spec, options, locale)),
    axis,
    axisTexts: axis === undefined ? [] : axis.ticks.map((tick) => axisFormat(tick, axis.step)),
  };
};

const widest = (frame: Frame, texts: readonly string[]): number =>
  texts.reduce((width, text) => Math.max(width, frame.measure(text, frame.fontSize)), 0);

const widestLabel = (frame: Frame): number =>
  frame.labels.reduce(
    (width, label) => Math.max(width, frame.measure(label.text, frame.fontSize)),
    0,
  );

const titleRoom = (frame: Frame, title: string | undefined): number =>
  title === undefined || title === '' ? 0 : frame.line + TICK_GAP;

const valueMapper = (
  frame: Frame,
  range: readonly [number, number],
): ((value: number) => number) =>
  frame.log
    ? logScale([frame.domain.min, frame.domain.max], range)
    : linearScale([frame.domain.min, frame.domain.max], range);

const baselineOf = (frame: Frame, value: (value: number) => number): number =>
  value(frame.log ? frame.domain.min : Math.min(Math.max(0, frame.domain.min), frame.domain.max));

const spacedOut = (
  labels: readonly CategoryLabel[],
  at: (index: number) => number,
  room: number,
): CategoryLabel[] =>
  labels.reduce<CategoryLabel[]>((kept, label) => {
    const last = kept.at(-1);

    if (last === undefined || Math.abs(at(label.index) - at(last.index)) >= room - ROUNDING) {
      kept.push(label);
    }
    return kept;
  }, []);

const clipOf = (frame: Frame, plot: Box): Box | undefined => {
  const axis = frame.spec.valueAxis;

  return axis?.min === undefined && axis?.max === undefined
    ? undefined
    : {
        x: plot.x - CLIP_SLACK,
        y: plot.y - CLIP_SLACK,
        width: plot.width + CLIP_SLACK * 2,
        height: plot.height + CLIP_SLACK * 2,
      };
};

const valueLines = (
  frame: Frame,
  plot: Box,
  at: (tick: number) => number,
  horizontal: boolean,
): SceneLine[] => {
  const grid = frame.spec.valueAxis?.gridlines ?? true;
  const zero = frame.log ? undefined : frame.domain.ticks.find((tick) => tick === 0);

  return frame.domain.ticks.reduce<SceneLine[]>((lines, tick) => {
    if (!grid && tick !== zero) {
      return lines;
    }

    const position = at(tick);

    lines.push(
      horizontal
        ? {
            role: tick === zero ? SceneLineRole.Baseline : SceneLineRole.Grid,
            x1: position,
            y1: plot.y,
            x2: position,
            y2: plot.y + plot.height,
          }
        : {
            role: tick === zero ? SceneLineRole.Baseline : SceneLineRole.Grid,
            x1: plot.x,
            y1: position,
            x2: plot.x + plot.width,
            y2: position,
          },
    );

    return lines;
  }, []);
};

const verticalPlot = (frame: Frame, overhang: number): Box => {
  const { size, rtl, line } = frame;

  const side =
    widest(frame, frame.valueTexts) + TICK_GAP + titleRoom(frame, frame.spec.valueAxis?.title);

  const bottom = line + TICK_GAP + titleRoom(frame, frame.spec.categoryAxis?.title);
  const left = PADDING + (rtl ? overhang : side);
  const right = size.width - PADDING - (rtl ? side : overhang);
  const top = PADDING + Math.ceil(frame.fontSize / 2);

  return {
    x: left,
    y: top,
    width: Math.max(right - left, 1),
    height: Math.max(size.height - PADDING - bottom - top, 1),
  };
};

const verticalTicks = (frame: Frame, plot: Box, value: (value: number) => number): SceneText[] => {
  const tickX = frame.rtl ? plot.x + plot.width + TICK_GAP : plot.x - TICK_GAP;

  return frame.domain.ticks.map((tick, index) => ({
    role: SceneTextRole.ValueTick,
    text: frame.valueTexts[index] ?? '',
    x: tickX,
    y: value(tick),
    anchor: frame.rtl ? 'start' : 'end',
    baseline: 'middle',
  }));
};

const columnScene = (frame: Frame): ChartScene => {
  const { rtl } = frame;
  const plot = verticalPlot(frame, 0);

  const band = bandScale(
    frame.count,
    rtl ? [plot.x + plot.width, plot.x] : [plot.x, plot.x + plot.width],
  );

  const value = valueMapper(frame, [plot.y + plot.height, plot.y]);
  const at = pointAt(frame.spec, band);
  const texts = verticalTicks(frame, plot, value);
  const room = Math.min(widestLabel(frame), plot.width);

  spacedOut(frame.labels, at, room + TICK_GAP).forEach((label) => {
    texts.push({
      role: SceneTextRole.CategoryTick,
      text: truncated(label.text, room, frame.fontSize, frame.measure),
      x: at(label.index),
      y: plot.y + plot.height + TICK_GAP,
      anchor: 'middle',
      baseline: 'top',
    });
  });

  titles(frame, plot, texts, false);

  return sceneOf(frame, plot, band, value, texts, false);
};

const scatterScene = (frame: Frame): ChartScene => {
  const axis = frame.axis ?? niceDomain(0, 1);
  const plot = verticalPlot(frame, frame.measure(frame.axisTexts.at(-1) ?? '', frame.fontSize) / 2);
  const right = plot.x + plot.width;
  const x = linearScale([axis.min, axis.max], frame.rtl ? [right, plot.x] : [plot.x, right]);
  const value = valueMapper(frame, [plot.y + plot.height, plot.y]);
  const texts = verticalTicks(frame, plot, value);

  const xs =
    frame.spec.categories.kind === ChartCategoriesKind.Text ? [] : frame.spec.categories.values;

  const slots = slotsOf(frame.spec.series);

  axis.ticks.forEach((tick, index) => {
    texts.push({
      role: SceneTextRole.CategoryTick,
      text: frame.axisTexts[index] ?? '',
      x: x(tick),
      y: plot.y + plot.height + TICK_GAP,
      anchor: 'middle',
      baseline: 'top',
    });
  });

  titles(frame, plot, texts, false);

  const series = frame.spec.series.map((item) => ({
    ...item,
    values: item.values.map((entry, index) => (Number.isFinite(xs[index]) ? entry : null)),
  }));

  return {
    width: frame.size.width,
    height: frame.size.height,
    plot,
    clip: clipOf(frame, plot),
    bars: [],
    paths: [],
    slices: [],
    axis: undefined,
    points: layoutLines(
      {
        area: false,
        at: (index) => x(xs[index] ?? 0),
        value,
        baseline: baselineOf(frame, value),
        slots,
        markers: true,
        gaps: ChartGaps.Break,
      },
      series,
      xs.length,
      'none',
    ).points,
    lines: [
      ...valueLines(frame, plot, value, false),
      ...axis.ticks.map((tick) => ({
        role: SceneLineRole.Grid,
        x1: x(tick),
        y1: plot.y,
        x2: x(tick),
        y2: plot.y + plot.height,
      })),
    ],
    texts,
    slots,
  };
};

const barCategoryWidth = (frame: Frame): number =>
  Math.min(widestLabel(frame), frame.size.width * CATEGORY_SHARE) + TICK_GAP;

const barPlot = (frame: Frame): Box => {
  const { size, rtl, line } = frame;
  const side = barCategoryWidth(frame) + titleRoom(frame, frame.spec.categoryAxis?.title);
  const bottom = line + TICK_GAP + titleRoom(frame, frame.spec.valueAxis?.title);
  const overhang = frame.measure(frame.valueTexts.at(-1) ?? '', frame.fontSize) / 2;
  const left = PADDING + (rtl ? overhang : side);
  const right = size.width - PADDING - (rtl ? side : overhang);

  return {
    x: left,
    y: PADDING,
    width: Math.max(right - left, 1),
    height: Math.max(size.height - PADDING * 2 - bottom, 1),
  };
};

const barScene = (frame: Frame): ChartScene => {
  const { rtl } = frame;
  const plot = barPlot(frame);
  const categoryWidth = barCategoryWidth(frame);

  const band = bandScale(frame.count, [plot.y, plot.y + plot.height]);

  const value = valueMapper(
    frame,
    rtl ? [plot.x + plot.width, plot.x] : [plot.x, plot.x + plot.width],
  );

  const labelX = rtl ? plot.x + plot.width + TICK_GAP : plot.x - TICK_GAP;
  const texts: SceneText[] = [];

  frame.domain.ticks.forEach((tick, index) => {
    texts.push({
      role: SceneTextRole.ValueTick,
      text: frame.valueTexts[index] ?? '',
      x: value(tick),
      y: plot.y + plot.height + TICK_GAP,
      anchor: 'middle',
      baseline: 'top',
    });
  });

  spacedOut(frame.labels, band.center, frame.line).forEach((label) => {
    texts.push({
      role: SceneTextRole.CategoryTick,
      text: truncated(label.text, categoryWidth - TICK_GAP, frame.fontSize, frame.measure),
      x: labelX,
      y: band.center(label.index),
      anchor: rtl ? 'start' : 'end',
      baseline: 'middle',
    });
  });

  titles(frame, plot, texts, true);

  return sceneOf(frame, plot, band, value, texts, true);
};

const titles = (frame: Frame, plot: Box, texts: SceneText[], horizontal: boolean): void => {
  const valueTitle = frame.spec.valueAxis?.title;
  const categoryTitle = frame.spec.categoryAxis?.title;
  const sideTitle = horizontal ? categoryTitle : valueTitle;
  const bottomTitle = horizontal ? valueTitle : categoryTitle;

  if (sideTitle !== undefined && sideTitle !== '') {
    texts.push({
      role: horizontal ? 'category-title' : 'value-title',
      text: sideTitle,
      x: frame.rtl ? frame.size.width - PADDING - frame.line / 2 : PADDING + frame.line / 2,
      y: plot.y + plot.height / 2,
      anchor: 'middle',
      baseline: 'middle',
      rotate: frame.rtl ? 90 : -90,
    });
  }
  if (bottomTitle === undefined || bottomTitle === '') {
    return;
  }

  texts.push({
    role: horizontal ? 'value-title' : 'category-title',
    text: bottomTitle,
    x: plot.x + plot.width / 2,
    y: frame.size.height - PADDING,
    anchor: 'middle',
    baseline: 'bottom',
  });
};

const sceneOf = (
  frame: Frame,
  plot: Box,
  band: BandScale,
  value: (value: number) => number,
  texts: readonly SceneText[],
  horizontal: boolean,
): ChartScene => {
  const slots = slotsOf(frame.spec.series);
  const baseline = baselineOf(frame, value);
  const stacking = frame.spec.stacking ?? 'none';
  const { count } = frame;

  if (linear(frame.spec)) {
    const at = pointAt(frame.spec, band);

    return {
      width: frame.size.width,
      height: frame.size.height,
      plot,
      clip: clipOf(frame, plot),
      bars: [],
      slices: [],
      axis: { horizontal, positions: Array.from({ length: count }, (_unused, index) => at(index)) },
      ...layoutLines(
        {
          area: frame.spec.kind === ChartKind.Area,
          at,
          value,
          baseline,
          slots,
          markers: plot.width / Math.max(count, 1) >= MARKER_ROOM,
          gaps: frame.spec.gaps ?? ChartGaps.Break,
        },
        frame.spec.series,
        count,
        stacking,
      ),
      lines: valueLines(frame, plot, value, horizontal),
      texts,
      slots,
    };
  }

  return {
    width: frame.size.width,
    height: frame.size.height,
    plot,
    clip: clipOf(frame, plot),
    paths: [],
    points: [],
    slices: [],
    axis: {
      horizontal,
      positions: Array.from({ length: count }, (_unused, index) => band.center(index)),
    },
    bars: layoutBars(
      {
        horizontal,
        mirrored: frame.rtl && !horizontal,
        band,
        value,
        baseline,
        stacking,
        slots,
      },
      frame.spec.series,
      count,
    ),
    lines: valueLines(frame, plot, value, horizontal),
    texts,
    slots,
  };
};

const pieSlots = (spec: ChartSpec): ChartSlot[] =>
  Array.from({ length: categoryCount(spec) }, (_unused, index) => SLOTS[index] ?? 0);

const pieScene = (spec: ChartSpec, size: ChartSize): ChartScene => {
  const radius = Math.max(Math.min(size.width, size.height) / 2 - PADDING, 1);
  const slots = pieSlots(spec);
  const hole = spec.kind === ChartKind.Doughnut ? Math.min(Math.max(spec.hole ?? HOLE, 0), 0.9) : 0;

  return {
    width: size.width,
    height: size.height,
    plot: {
      x: size.width / 2 - radius,
      y: size.height / 2 - radius,
      width: radius * 2,
      height: radius * 2,
    },
    clip: undefined,
    bars: [],
    paths: [],
    points: [],
    axis: undefined,
    slices: layoutSlices(
      { cx: size.width / 2, cy: size.height / 2, radius, hole: radius * hole, slots },
      spec.kind === ChartKind.Pie ? spec.series.slice(0, 1) : spec.series,
    ),
    lines: [],
    texts: [],
    slots,
  };
};

const ticksFit = (frame: Frame): boolean => {
  const count = frame.domain.ticks.length;

  if (frame.spec.kind === ChartKind.Bar) {
    return (widest(frame, frame.valueTexts) + TICK_GAP * 2) * count <= barPlot(frame).width;
  }

  const across =
    frame.axis === undefined ||
    (widest(frame, frame.axisTexts) + TICK_GAP * 2) * frame.axisTexts.length <=
      verticalPlot(frame, 0).width;

  return across && (frame.line + TICK_GAP) * count <= frame.size.height;
};

const fittedFrame = (spec: ChartSpec, size: ChartSize, options: LayoutOptions): Frame => {
  let frame = frameOf(spec, size, options, MOST_TICKS);

  for (let ticks = MOST_TICKS - 1; ticks >= FEWEST_TICKS && !ticksFit(frame); ticks -= 1) {
    frame = frameOf(spec, size, options, ticks);
  }
  return frame;
};

export const layoutChart = (
  spec: ChartSpec,
  size: ChartSize,
  options: LayoutOptions = {},
): ChartScene => {
  if (spec.kind === ChartKind.Pie || spec.kind === ChartKind.Doughnut) {
    return pieScene(spec, size);
  }

  const frame = fittedFrame(spec, size, options);

  switch (spec.kind) {
    case ChartKind.Bar:
      return barScene(frame);
    case ChartKind.Scatter:
      return scatterScene(frame);
    default:
      return columnScene(frame);
  }
};
