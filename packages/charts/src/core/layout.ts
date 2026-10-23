import { layoutBars } from './bars';
import type {
  Box,
  ChartScene,
  ChartSeries,
  ChartSize,
  ChartSlot,
  ChartSpec,
  LayoutOptions,
  SceneLine,
  SceneText,
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
import { timeTicks } from './time';

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
  readonly categoryTexts: readonly string[];
}

const PADDING = 4;

const TICK_GAP = 8;

const SLOTS: readonly ChartSlot[] = [1, 2, 3, 4, 5, 6, 7, 8];

const CATEGORY_SHARE = 0.4;

const MOST_TICKS = 5;

const FEWEST_TICKS = 2;

const slotsOf = (series: readonly ChartSeries[]): ChartSlot[] =>
  series.map((item, index) => item.slot ?? SLOTS[index] ?? 0);

const finite = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

const categoryCount = (spec: ChartSpec): number =>
  spec.categories.kind === 'text' ? spec.categories.labels.length : spec.categories.values.length;

const extent = (values: readonly number[]): readonly [number, number] =>
  values.length === 0 ? [0, 1] : [Math.min(...values), Math.max(...values)];

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

const valuesOf = (spec: ChartSpec): number[] =>
  spec.series.flatMap((item) => item.values.filter(finite));

const domainOf = (
  spec: ChartSpec,
  count: number,
  ticks: number,
): { domain: NiceDomain; log: boolean } => {
  const axis = spec.valueAxis ?? {};
  const stacking = spec.stacking ?? 'none';

  if (stacking === 'percent') {
    const [low] = stackedExtent(spec, count);

    return {
      domain: niceDomain(low < 0 ? -1 : 0, 1, { min: low < 0 ? -1 : 0, max: 1, count: ticks }),
      log: false,
    };
  }

  const positive = valuesOf(spec).filter((value) => value > 0);

  if (axis.scale === 'log' && stacking === 'none' && positive.length > 0) {
    const [low, high] = extent(positive);

    return { domain: logDomain(axis.min ?? low, axis.max ?? high), log: true };
  }

  const [low, high] = stacking === 'stacked' ? stackedExtent(spec, count) : extent(valuesOf(spec));

  return {
    domain: niceDomain(low, high, { zero: true, min: axis.min, max: axis.max, count: ticks }),
    log: false,
  };
};

const categoryTextsOf = (spec: ChartSpec, options: LayoutOptions, locale: string): string[] => {
  if (spec.categories.kind === 'text') {
    return [...spec.categories.labels];
  }

  const { values } = spec.categories;
  const [low, high] = extent(values);
  const { unit } = timeTicks(low, high, Math.max(values.length, 2));
  const format = options.formatTime ?? timeFormatter(locale);

  return values.map((value) => format(value, unit));
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
    numberFormatter(locale, numberStyle(largest, spec.stacking === 'percent'));

  return {
    spec,
    size,
    rtl: options.rtl ?? false,
    fontSize,
    line: Math.ceil(fontSize * 1.25),
    measure: options.measure ?? estimateWidth,
    domain,
    log,
    valueTexts: domain.ticks.map((tick) => format(tick, domain.step)),
    categoryTexts: categoryTextsOf(spec, options, locale),
  };
};

const widest = (frame: Frame, texts: readonly string[]): number =>
  texts.reduce((width, text) => Math.max(width, frame.measure(text, frame.fontSize)), 0);

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

const thinned = (frame: Frame, band: BandScale, labels: readonly string[]): number =>
  Math.max(1, Math.ceil((widest(frame, labels) + TICK_GAP) / Math.max(band.step, 1)));

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
            role: tick === zero ? 'baseline' : 'grid',
            x1: position,
            y1: plot.y,
            x2: position,
            y2: plot.y + plot.height,
          }
        : {
            role: tick === zero ? 'baseline' : 'grid',
            x1: plot.x,
            y1: position,
            x2: plot.x + plot.width,
            y2: position,
          },
    );

    return lines;
  }, []);
};

const columnScene = (frame: Frame): ChartScene => {
  const { size, rtl, line } = frame;
  const valueWidth = widest(frame, frame.valueTexts) + TICK_GAP;
  const side = valueWidth + titleRoom(frame, frame.spec.valueAxis?.title);
  const bottom = line + TICK_GAP + titleRoom(frame, frame.spec.categoryAxis?.title);
  const left = PADDING + (rtl ? 0 : side);
  const right = size.width - PADDING - (rtl ? side : 0);
  const top = PADDING + Math.ceil(frame.fontSize / 2);

  const plot: Box = {
    x: left,
    y: top,
    width: Math.max(right - left, 1),
    height: Math.max(size.height - PADDING - bottom - top, 1),
  };

  const count = frame.categoryTexts.length;

  const band = bandScale(
    count,
    rtl ? [plot.x + plot.width, plot.x] : [plot.x, plot.x + plot.width],
  );

  const value = valueMapper(frame, [plot.y + plot.height, plot.y]);
  const every = thinned(frame, band, frame.categoryTexts);
  const tickX = rtl ? plot.x + plot.width + TICK_GAP : plot.x - TICK_GAP;
  const texts: SceneText[] = [];

  frame.domain.ticks.forEach((tick, index) => {
    texts.push({
      role: 'value-tick',
      text: frame.valueTexts[index] ?? '',
      x: tickX,
      y: value(tick),
      anchor: rtl ? 'start' : 'end',
      baseline: 'middle',
    });
  });

  frame.categoryTexts.forEach((text, index) => {
    if (index % every === 0) {
      texts.push({
        role: 'category-tick',
        text: truncated(text, band.step * every - TICK_GAP, frame.fontSize, frame.measure),
        x: band.center(index),
        y: plot.y + plot.height + TICK_GAP,
        anchor: 'middle',
        baseline: 'top',
      });
    }
  });

  titles(frame, plot, texts, false);

  return sceneOf(frame, plot, band, value, texts, false);
};

const barCategoryWidth = (frame: Frame): number =>
  Math.min(widest(frame, frame.categoryTexts), frame.size.width * CATEGORY_SHARE) + TICK_GAP;

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

  const band = bandScale(frame.categoryTexts.length, [plot.y, plot.y + plot.height]);

  const value = valueMapper(
    frame,
    rtl ? [plot.x + plot.width, plot.x] : [plot.x, plot.x + plot.width],
  );

  const labelX = rtl ? plot.x + plot.width + TICK_GAP : plot.x - TICK_GAP;
  const texts: SceneText[] = [];

  frame.domain.ticks.forEach((tick, index) => {
    texts.push({
      role: 'value-tick',
      text: frame.valueTexts[index] ?? '',
      x: value(tick),
      y: plot.y + plot.height + TICK_GAP,
      anchor: 'middle',
      baseline: 'top',
    });
  });

  frame.categoryTexts.forEach((text, index) => {
    texts.push({
      role: 'category-tick',
      text: truncated(text, categoryWidth - TICK_GAP, frame.fontSize, frame.measure),
      x: labelX,
      y: band.center(index),
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
  if (bottomTitle !== undefined && bottomTitle !== '') {
    texts.push({
      role: horizontal ? 'value-title' : 'category-title',
      text: bottomTitle,
      x: plot.x + plot.width / 2,
      y: frame.size.height - PADDING,
      anchor: 'middle',
      baseline: 'bottom',
    });
  }
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

  return {
    width: frame.size.width,
    height: frame.size.height,
    plot,
    bars: layoutBars(
      {
        horizontal,
        mirrored: frame.rtl && !horizontal,
        band,
        value,
        baseline: baselineOf(frame, value),
        stacking: frame.spec.stacking ?? 'none',
        slots,
      },
      frame.spec.series,
      frame.categoryTexts.length,
    ),
    lines: valueLines(frame, plot, value, horizontal),
    texts,
    slots,
  };
};

const ticksFit = (frame: Frame): boolean => {
  const count = frame.domain.ticks.length;

  if (frame.spec.kind === 'bar') {
    return (widest(frame, frame.valueTexts) + TICK_GAP * 2) * count <= barPlot(frame).width;
  }
  return (frame.line + TICK_GAP) * count <= frame.size.height;
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
  const frame = fittedFrame(spec, size, options);

  return spec.kind === 'bar' ? barScene(frame) : columnScene(frame);
};
