// @vitest-environment node
import { renderToString } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import { NuiChart, type ChartKind, type ChartSpec } from '../src';

const spec: ChartSpec = {
  kind: 'bar',
  stacking: 'stacked',
  categories: { kind: 'text', labels: ['North', 'South'] },
  series: [
    { id: 'a', name: 'Plan', values: [3, 4] },
    { id: 'b', name: 'Fact', values: [2, 5] },
  ],
};

describe('NuiChart on the server', () => {
  it('renders the scene, the legend and the data table without a DOM', async () => {
    const html = await renderToString(NuiChart, { props: { spec, label: 'Plan and fact' } });

    expect(html).toContain('aria-label="Plan and fact"');
    expect(html).toContain('class="nui-chart__svg"');
    expect(html.match(/<path class="[^"]*nui-chart__bar--slot-\d/g)).toHaveLength(4);
    expect(html).toContain('<caption class="nui-chart__caption">Plan and fact</caption>');
    expect(html).toContain('nui-chart__legend');
  });

  it('renders every kind with its marks and a focusable figure', async () => {
    const marks: readonly (readonly [ChartKind, string])[] = [
      ['column', 'nui-chart__bar'],
      ['bar', 'nui-chart__bar'],
      ['line', 'nui-chart__stroke'],
      ['area', 'nui-chart__area'],
      ['pie', 'nui-chart__slice'],
      ['doughnut', 'nui-chart__slice'],
      ['scatter', 'nui-chart__point'],
    ];

    for (const [kind, mark] of marks) {
      const html = await renderToString(NuiChart, {
        props: {
          spec: {
            ...spec,
            kind,
            stacking: 'none',
            categories: kind === 'scatter' ? { kind: 'number', values: [1, 2] } : spec.categories,
          },
          label: 'Plan and fact',
        },
      });

      expect(html).toContain(`class="${mark}`);
      expect(html).toContain('tabindex="0"');
      expect(html).not.toContain('nui-chart__tooltip');
    }
  });

  it('renders the same markup twice', async () => {
    const first = await renderToString(NuiChart, { props: { spec, label: 'Plan and fact' } });
    const second = await renderToString(NuiChart, { props: { spec, label: 'Plan and fact' } });

    expect(second).toBe(first);
  });
});
