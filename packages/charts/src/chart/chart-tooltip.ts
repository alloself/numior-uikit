import type { ChartHit, ChartScene, ChartSpec } from '../core';
import { categoryTexts, valueText } from './chart-table';
import type { NuiChartTooltipContent } from './chart.types';

const percents = new Map<string, Intl.NumberFormat>();

const percentText = (share: number, locale: string): string => {
  const known =
    percents.get(locale) ??
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });

  percents.set(locale, known);
  return known.format(share);
};

export const tooltipContent = (
  spec: ChartSpec,
  scene: ChartScene,
  hit: ChartHit,
  locale: string,
): NuiChartTooltipContent => {
  const category = categoryTexts(spec, locale)[hit.index] ?? '';
  const series = hit.series === undefined ? undefined : spec.series[hit.series];
  const slice = scene.slices.find((item) => item.index === hit.index && item.series === hit.series);

  if (slice !== undefined) {
    return {
      title: category,
      rows: [
        {
          key: 'value',
          slot: slice.slot,
          name: spec.series.length > 1 ? (series?.name ?? '') : '',
          value: `${valueText(slice.value, locale)} · ${percentText(slice.share, locale)}`,
        },
      ],
    };
  }
  if (series !== undefined) {
    return {
      title: series.name,
      rows: [
        { key: 'x', slot: undefined, name: spec.categoryAxis?.title ?? 'X', value: category },
        {
          key: 'y',
          slot: undefined,
          name: spec.valueAxis?.title ?? 'Y',
          value: valueText(series.values[hit.index], locale),
        },
      ],
    };
  }
  return {
    title: category,
    rows: spec.series.map((item, position) => ({
      key: item.id,
      slot: scene.slots[position],
      name: item.name,
      value: valueText(item.values[hit.index], locale),
    })),
  };
};

export const tooltipText = (content: NuiChartTooltipContent): string =>
  `${content.title}: ${content.rows.map((row) => (row.name === '' ? row.value : `${row.name} ${row.value}`)).join(', ')}`;
