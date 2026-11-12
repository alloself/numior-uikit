import { layoutBars } from './bars';
import { layoutLines, stackedTops, topsExtent, type StackTops } from './lines';
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
import { timeDomain, timeGrain, timeTicks } from './time';
import { timeZoneOf } from './zone';

interface CategoryLabel {
  readonly index: number;
  readonly text: string;
}

interface ValueFacts {
  readonly count: number;
  readonly log: boolean;
  readonly low: number;
  readonly high: number;
}

interface Across {
  readonly min: number;
  readonly max: number;
  readonly ticks: readonly number[];
  readonly texts: readonly string[];
}

interface ScatterPlacement {
  readonly at: (index: number) => number;
  readonly placed: (index: number) => boolean;
  readonly lines: readonly SceneLine[];
}

interface FrameBase {
  readonly spec: ChartSpec;
  readonly facts: ValueFacts;
  readonly tops: StackTops | undefined;
  readonly labels: readonly CategoryLabel[];
  readonly span: readonly [number, number] | undefined;
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
  readonly across: Across | undefined;
  readonly tops: StackTops | undefined;
  readonly span: readonly [number, number] | undefined;
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

const EMPTY_EXTENT: readonly [number, number] = [0, 1];

const NO_MOMENTS: Across = { min: 0, max: 1, ticks: [], texts: [] };

const HALF_DAY = 12 * 60 * 60 * 1000;

const slotsOf = (series: readonly ChartSeries[]): ChartSlot[] =>
  series.map((item, index) => item.slot ?? SLOTS[index] ?? 0);

const finite = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

const categoryCount = (spec: ChartSpec): number =>
  spec.categories.kind === ChartCategoriesKind.Text
    ? spec.categories.labels.length
    : spec.categories.values.length;

const finiteSpan = (values: readonly number[]): readonly [number, number] | undefined => {
  let low = Infinity;
  let high = -Infinity;

  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }

    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return low > high ? undefined : [low, high];
};

const linear = (spec: ChartSpec): boolean =>
  spec.kind === ChartKind.Line || spec.kind === ChartKind.Area;

const pointAt = (frame: Frame, band: BandScale): ((index: number) => number) => {
  const { spec, span } = frame;

  if (
    !linear(spec) ||
    spec.categories.kind === ChartCategoriesKind.Text ||
    spec.categories.values.length < 2 ||
    span === undefined
  ) {
    return band.center;
  }

  const { values } = spec.categories;
  const [first, last] = span;
  const position = linearScale([first, last], [band.center(0), band.center(values.length - 1)]);
  const start = position(first);

  if (values.every(Number.isFinite)) {
    return (index) => position(values[index] ?? first);
  }

  const placed = values.reduce<number[]>((found, value, index) => {
    found.push(Number.isFinite(value) ? position(value) : (found[index - 1] ?? start));
    return found;
  }, []);

  return (index) => placed[index] ?? start;
};

const placedSeries = (spec: ChartSpec): readonly ChartSeries[] => {
  const { categories } = spec;

  if (categories.kind === ChartCategoriesKind.Text || categories.values.every(Number.isFinite)) {
    return spec.series;
  }
  return spec.series.map((item) => ({
    ...item,
    values: item.values.map((entry, index) =>
      Number.isFinite(categories.values[index]) ? entry : null,
    ),
  }));
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

  return finiteSpan(sums.flatMap((sum) => [sum.positive, sum.negative])) ?? EMPTY_EXTENT;
};

const positiveOr = (bound: number | undefined, fallback: number): number =>
  bound !== undefined && bound > 0 ? bound : fallback;

const positiveOnly = (series: ChartSeries): ChartSeries => ({
  ...series,
  values: series.values.map((value) => (finite(value) && value > 0 ? value : null)),
});

const spanAbove = (spec: ChartSpec, floor: number): readonly [number, number] | undefined => {
  let low = Infinity;
  let high = -Infinity;

  for (const item of spec.series) {
    for (const value of item.values) {
      if (!finite(value) || value <= floor) {
        continue;
      }

      low = Math.min(low, value);
      high = Math.max(high, value);
    }
  }
  return low > high ? undefined : [low, high];
};

const topsOf = (spec: ChartSpec, count: number): StackTops | undefined => {
  const stacking = spec.stacking ?? 'none';

  if (!linear(spec) || stacking === ChartStacking.None) {
    return undefined;
  }
  return stackedTops(spec.series, count, stacking === ChartStacking.Percent);
};

const valueFactsOf = (spec: ChartSpec, count: number, tops: StackTops | undefined): ValueFacts => {
  const stacking = spec.stacking ?? 'none';

  const stacked = (): readonly [number, number] =>
    tops === undefined ? stackedExtent(spec, count) : topsExtent(tops);

  if (stacking === ChartStacking.Percent) {
    return { count, log: false, low: stacked()[0], high: 1 };
  }
  if (stacking !== ChartStacking.None) {
    const [low, high] = stacked();

    return { count, log: false, low, high };
  }

  const positive = spec.valueAxis?.scale === ChartScale.Log ? spanAbove(spec, 0) : undefined;

  if (positive !== undefined) {
    return { count, log: true, low: positive[0], high: positive[1] };
  }

  const [low, high] = spanAbove(spec, -Infinity) ?? EMPTY_EXTENT;

  return { count, log: false, low, high };
};

const domainOf = (spec: ChartSpec, facts: ValueFacts, ticks: number): NiceDomain => {
  const axis = spec.valueAxis ?? {};

  if ((spec.stacking ?? 'none') === ChartStacking.Percent) {
    const bottom = facts.low < 0 ? -1 : 0;

    return niceDomain(bottom, 1, { min: bottom, max: 1, count: ticks });
  }
  if (facts.log) {
    return logDomain(positiveOr(axis.min, facts.low), positiveOr(axis.max, facts.high), ticks);
  }
  return niceDomain(facts.low, facts.high, {
    zero: spec.kind !== ChartKind.Line && spec.kind !== ChartKind.Scatter,
    min: axis.min,
    max: axis.max,
    count: ticks,
  });
};

const finiteLabel = (value: number | undefined, format: (value: number) => string): string =>
  value === undefined || !Number.isFinite(value) ? '' : format(value);

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

    return (index) => finiteLabel(values[index], (value) => plain(value, 0));
  }

  const zone = timeZoneOf(options.timeZone);
  const { unit, context } = timeGrain(values, zone);
  const format = options.formatTime ?? timeFormatter(locale, context, zone.name);

  return (index) => finiteLabel(values[index], (value) => format(value, unit));
};

const categoryLabels = (count: number, text: (index: number) => string): CategoryLabel[] => {
  const stride = Math.max(1, Math.ceil(count / MOST_LABELS));

  return Array.from({ length: Math.ceil(count / stride) }).reduce<CategoryLabel[]>(
    (labels, _unused, place) => {
      const label = { index: place * stride, text: text(place * stride) };

      if (label.text !== '') {
        labels.push(label);
      }
      return labels;
    },
    [],
  );
};

const spanOf = (spec: ChartSpec): readonly [number, number] | undefined =>
  spec.categories.kind === ChartCategoriesKind.Text
    ? undefined
    : finiteSpan(spec.categories.values);

const baseOf = (spec: ChartSpec, options: LayoutOptions): FrameBase => {
  const count = categoryCount(spec);
  const tops = topsOf(spec, count);
  const facts = valueFactsOf(spec, count, tops);

  return {
    spec: facts.log ? { ...spec, series: spec.series.map(positiveOnly) } : spec,
    facts,
    tops,
    labels: categoryLabels(facts.count, categoryText(spec, options, options.locale ?? 'en')),
    span: spanOf(spec),
  };
};

const numberAcross = (
  span: readonly [number, number],
  options: LayoutOptions,
  ticks: number,
): Across => {
  const axis = niceDomain(span[0], span[1], { count: ticks });

  const format =
    options.formatNumber ??
    numberFormatter(
      options.locale ?? 'en',
      numberStyle(Math.max(Math.abs(axis.min), Math.abs(axis.max)), false),
    );

  return {
    min: axis.min,
    max: axis.max,
    ticks: axis.ticks,
    texts: axis.ticks.map((tick) => format(tick, axis.step)),
  };
};

const timeAcross = (
  span: readonly [number, number] | undefined,
  options: LayoutOptions,
  ticks: number,
): Across => {
  if (span === undefined) {
    return NO_MOMENTS;
  }

  const zone = timeZoneOf(options.timeZone);
  const [low, high] = span;

  const found =
    low === high
      ? {
          ...timeTicks(low - HALF_DAY, high + HALF_DAY, ticks, zone.name),
          min: low - HALF_DAY,
          max: high + HALF_DAY,
        }
      : timeDomain(low, high, ticks, zone.name);

  const { unit, context } = timeGrain(found.values, zone);
  const format = options.formatTime ?? timeFormatter(options.locale ?? 'en', context, zone.name);

  return {
    min: found.min,
    max: found.max,
    ticks: found.values,
    texts: found.values.map((tick) => format(tick, unit)),
  };
};

const acrossOf = (base: FrameBase, options: LayoutOptions, ticks: number): Across | undefined => {
  const { spec, span } = base;

  if (spec.kind !== ChartKind.Scatter) {
    return undefined;
  }

  switch (spec.categories.kind) {
    case ChartCategoriesKind.Number:
      return numberAcross(span ?? EMPTY_EXTENT, options, ticks);
    case ChartCategoriesKind.Time:
      return timeAcross(span, options, ticks);
    default:
      return undefined;
  }
};

const frameOf = (
  base: FrameBase,
  size: ChartSize,
  options: LayoutOptions,
  ticks: number,
): Frame => {
  const { spec, facts } = base;
  const locale = options.locale ?? 'en';
  const fontSize = options.fontSize ?? 12;
  const domain = domainOf(spec, facts, ticks);
  const largest = Math.max(Math.abs(domain.min), Math.abs(domain.max));

  const format =
    options.formatNumber ??
    numberFormatter(locale, numberStyle(largest, spec.stacking === ChartStacking.Percent));

  return {
    spec,
    size,
    rtl: options.rtl ?? false,
    fontSize,
    line: Math.ceil(fontSize * 1.25),
    measure: options.measure ?? estimateWidth,
    domain,
    log: facts.log,
    valueTexts: domain.ticks.map((tick) => format(tick, facts.log ? tick : domain.step)),
    count: facts.count,
    labels: base.labels,
    across: acrossOf(base, options, ticks),
    tops: base.tops,
    span: base.span,
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
  const texts = verticalTicks(frame, plot, value);

  categoryTicks(frame, plot, pointAt(frame, band), texts);
  titles(frame, plot, texts, false);

  return sceneOf(frame, plot, band, value, texts, false);
};

const categoryTicks = (
  frame: Frame,
  plot: Box,
  at: (index: number) => number,
  texts: SceneText[],
): void => {
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
};

const scaledPlacement = (
  frame: Frame,
  plot: Box,
  across: Across,
  texts: SceneText[],
): ScatterPlacement => {
  const right = plot.x + plot.width;
  const x = linearScale([across.min, across.max], frame.rtl ? [right, plot.x] : [plot.x, right]);

  const xs =
    frame.spec.categories.kind === ChartCategoriesKind.Text ? [] : frame.spec.categories.values;

  across.ticks.forEach((tick, index) => {
    texts.push({
      role: SceneTextRole.CategoryTick,
      text: across.texts[index] ?? '',
      x: x(tick),
      y: plot.y + plot.height + TICK_GAP,
      anchor: 'middle',
      baseline: 'top',
    });
  });

  return {
    at: (index) => x(xs[index] ?? 0),
    placed: (index) => Number.isFinite(xs[index]),
    lines: across.ticks.map((tick) => ({
      role: SceneLineRole.Grid,
      x1: x(tick),
      y1: plot.y,
      x2: x(tick),
      y2: plot.y + plot.height,
    })),
  };
};

const bandPlacement = (frame: Frame, plot: Box, texts: SceneText[]): ScatterPlacement => {
  const right = plot.x + plot.width;
  const band = bandScale(frame.count, frame.rtl ? [right, plot.x] : [plot.x, right]);

  categoryTicks(frame, plot, band.center, texts);

  return { at: band.center, placed: () => true, lines: [] };
};

const scatterScene = (frame: Frame): ChartScene => {
  const { across } = frame;

  const overhang =
    across === undefined ? 0 : frame.measure(across.texts.at(-1) ?? '', frame.fontSize) / 2;

  const plot = verticalPlot(frame, overhang);
  const value = valueMapper(frame, [plot.y + plot.height, plot.y]);
  const texts = verticalTicks(frame, plot, value);

  const placement =
    across === undefined
      ? bandPlacement(frame, plot, texts)
      : scaledPlacement(frame, plot, across, texts);

  const slots = slotsOf(frame.spec.series);

  titles(frame, plot, texts, false);

  const series = frame.spec.series.map((item) => ({
    ...item,
    values: item.values.map((entry, index) => (placement.placed(index) ? entry : null)),
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
        at: placement.at,
        value,
        baseline: baselineOf(frame, value),
        slots,
        markers: true,
        gaps: ChartGaps.Break,
      },
      series,
      frame.count,
      undefined,
    ).points,
    lines: [...valueLines(frame, plot, value, false), ...placement.lines],
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
    const at = pointAt(frame, band);
    const positions = Array.from({ length: count }, (_unused, index) => at(index));

    return {
      width: frame.size.width,
      height: frame.size.height,
      plot,
      clip: clipOf(frame, plot),
      bars: [],
      slices: [],
      axis: { horizontal, positions },
      ...layoutLines(
        {
          area: frame.spec.kind === ChartKind.Area,
          at: (index) => positions[index] ?? 0,
          value,
          baseline,
          slots,
          markers: plot.width / Math.max(count, 1) >= MARKER_ROOM,
          gaps: frame.spec.gaps ?? ChartGaps.Break,
        },
        placedSeries(frame.spec),
        count,
        frame.tops,
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
    frame.across === undefined ||
    (widest(frame, frame.across.texts) + TICK_GAP * 2) * frame.across.texts.length <=
      verticalPlot(frame, 0).width;

  return across && (frame.line + TICK_GAP) * count <= frame.size.height;
};

const fittedFrame = (spec: ChartSpec, size: ChartSize, options: LayoutOptions): Frame => {
  const base = baseOf(spec, options);
  let frame = frameOf(base, size, options, MOST_TICKS);

  for (let ticks = MOST_TICKS - 1; ticks >= FEWEST_TICKS && !ticksFit(frame); ticks -= 1) {
    frame = frameOf(base, size, options, ticks);
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
