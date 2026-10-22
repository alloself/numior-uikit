import type { LineLayout, LineLayouts } from '../../core/layout/layout.types';
import { escapeAttribute } from '../xml/writer';
import type { StyleBook } from './styles-part';

interface Run {
  readonly first: number;
  last: number;
  readonly layout: LineLayout;
}

const flag = (name: string, on: boolean): string => (on ? ` ${name}="1"` : '');

const extraOf = (layout: LineLayout): string =>
  layout.extra.map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join('');

const commonOf = (layout: LineLayout): string =>
  `${flag('hidden', layout.hidden)}${
    layout.level > 0 ? ` outlineLevel="${String(layout.level)}"` : ''
  }${flag('collapsed', layout.collapsed)}${extraOf(layout)}`;

const xfOf = (layout: LineLayout, styles: StyleBook): number | undefined =>
  layout.style === undefined ? undefined : styles.xf(layout.style.format, layout.style.decoration);

export const rowAttributes = (layout: LineLayout | undefined, styles: StyleBook): string => {
  if (layout === undefined) {
    return '';
  }

  const xf = xfOf(layout, styles);

  return `${xf === undefined ? '' : ` s="${String(xf)}" customFormat="1"`}${
    layout.size === undefined ? '' : ` ht="${String(layout.size)}"`
  }${flag('customHeight', layout.custom)}${commonOf(layout)}`;
};

const colXml = (run: Run, styles: StyleBook, q: string): string => {
  const xf = xfOf(run.layout, styles);

  return `<${q}col min="${String(run.first + 1)}" max="${String(run.last + 1)}"${
    run.layout.size === undefined ? '' : ` width="${String(run.layout.size)}"`
  }${xf === undefined ? '' : ` style="${String(xf)}"`}${flag('customWidth', run.layout.custom)}${commonOf(
    run.layout,
  )}/>`;
};

export const colsXml = (cols: LineLayouts, styles: StyleBook, q: string): string => {
  const runs: Run[] = [];

  cols.forEach((col, layout) => {
    const previous = runs.at(-1);

    if (previous !== undefined && previous.last === col - 1 && previous.layout === layout) {
      previous.last = col;
    } else {
      runs.push({ first: col, last: col, layout });
    }
  });

  return runs.length === 0
    ? ''
    : `<${q}cols>${runs.map((run) => colXml(run, styles, q)).join('')}</${q}cols>`;
};
