# Charts

Every chart is built from one object that holds the categories and the series of values.

<Example name="charts/Revenue" />

Hover a column or walk the columns with the arrow keys to see the value in a tooltip.

## Installation

```ts install:packages
import { NuiChart } from '@numior/kit/charts';
```

Series colors come from the theme tokens `--color-chart-1`…`--color-chart-8`, so they follow the light and dark theme.

## Describe a chart

Describe the chart as a `ChartSpec` object and pass it to `spec`:

```ts
import type { ChartSpec } from '@numior/kit/charts';

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: ['January', 'February', 'March', 'April'] },
  series: [{ id: 'revenue', name: 'Revenue, $', values: [18_400, 21_250, null, 24_800] }],
};
```

A series holds one value per category, in the same order. Put `null` where a value is missing: the chart draws nothing there, and the tooltip shows a dash.

## Examples

### Compare series

Pass several series to show them side by side.

<Example name="charts/Compare" />

### Stack series

Set `stacking` to put the series on top of each other.

<Example name="charts/Stacked" />

With `percent`, every column adds up to 100% and shows the share of each status. Lines and areas stack the same way.

### Turn columns into bars

Set `kind: 'bar'` when the category names are long.

<Example name="charts/Bars" />

### Show a trend

Pass the dates in `{ kind: 'time' }` categories.

<Example name="charts/Trend" />

The dates are timestamps in milliseconds, and the axis labels them in UTC. Set `kind: 'area'` to fill the space under the line.

### Bridge empty days

Set `gaps: 'connect'` to carry the line over missing values.

<Example name="charts/Gaps" />

By default the line breaks at every `null`. With `connect`, a dashed segment joins the points on both sides of the gap.

### Show shares

Set `kind: 'doughnut'` to show each category as a part of the whole.

<Example name="charts/Shares" />

The tooltip shows the value together with its share. A pie draws only the first series, and each category gets its own color. A doughnut draws every series as a ring of its own.

### Relate two values

Set `kind: 'scatter'` and pass numbers in `{ kind: 'number' }` categories.

<Example name="charts/Scatter" />

The categories place each point along the horizontal axis, and the series values place it along the vertical one. The axis titles also name the rows of the tooltip.

### Select a value

Bind `v-model:selected` to show the orders of the month the user picks.

<Example name="charts/Selection" />

While a column is selected, the other columns fade. A second click or Enter on the selected column clears the model to `null`.

### Replace the tooltip

Put your own content in the `tooltip` slot.

<Example name="charts/Tooltip" />

Screen readers still announce the built-in text with the category and the values of every series.

### Fill a card

Set `height="fill"` to stretch the chart to the height of its container.

<Example name="charts/Fill" />

The container needs a height of its own: in a grid row, the card stretches to the height of its neighbor. The chart redraws whenever the container changes size.

## Accessibility

The chart is a figure named by `label`, and a hidden data table repeats every value for screen readers. When the arrow keys reach a value, a screen reader announces it with the text of the built-in tooltip.

Set `showTable` to show the data table to everyone. Set `:focusable="false"` to take the chart out of the Tab order.

<KeyboardReference name="NuiChart" />

## API

<ApiReference name="NuiChart" />

### Types

```ts
interface ChartSpec {
  kind: 'column' | 'bar' | 'line' | 'area' | 'pie' | 'doughnut' | 'scatter';
  categories: ChartCategories;
  series: ChartSeries[];
  stacking?: 'none' | 'stacked' | 'percent';
  gaps?: 'break' | 'connect';
  valueAxis?: ChartValueAxis;
  categoryAxis?: { title?: string };
  hole?: number;
}

type ChartCategories =
  | { kind: 'text'; labels: string[] }
  | { kind: 'time'; values: number[] }
  | { kind: 'number'; values: number[] };

interface ChartSeries {
  id: string;
  name: string;
  values: (number | null)[];
  slot?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

interface ChartValueAxis {
  title?: string;
  min?: number;
  max?: number;
  scale?: 'linear' | 'log';
  gridlines?: boolean;
}

interface ChartHit {
  index: number;
  series: number | undefined;
}
```
