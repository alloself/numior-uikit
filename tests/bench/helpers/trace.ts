import type { Browser, Locator, Page } from '@playwright/test';
import { readFile, rm } from 'node:fs/promises';

interface TraceEvent {
  readonly name: string;
  readonly ph: string;
  readonly ts: number;
  readonly dur?: number;
}

interface TraceFile {
  readonly traceEvents: readonly TraceEvent[];
}

export interface WindowMoveOptions {
  readonly jump: number;
  readonly rounds: number;
  readonly path: string;
}

const PHASES: ReadonlySet<string> = new Set([
  'EventDispatch',
  'FunctionCall',
  'UpdateLayoutTree',
  'Layout',
  'PrePaint',
  'Paint',
  'Layerize',
  'Commit',
]);

const CATEGORIES = ['devtools.timeline', 'disabled-by-default-devtools.timeline'];

const mainThreadMs = (events: readonly TraceEvent[]): number => {
  const spans = events
    .filter((event) => event.ph === 'X' && PHASES.has(event.name))
    .map((event) => ({ from: event.ts, to: event.ts + (event.dur ?? 0) }))
    .toSorted((a, b) => a.from - b.from);

  let total = 0;
  let open: { from: number; to: number } | undefined;

  for (const span of spans) {
    if (open !== undefined && span.from <= open.to) {
      open = { from: open.from, to: Math.max(open.to, span.to) };
      continue;
    }
    total += open === undefined ? 0 : open.to - open.from;
    open = span;
  }
  return (total + (open === undefined ? 0 : open.to - open.from)) / 1000;
};

const settle = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );

export const windowMoveSamples = async (
  browser: Browser,
  page: Page,
  scroller: Locator,
  { jump, rounds, path }: WindowMoveOptions,
): Promise<number[]> => {
  const samples: number[] = [];

  for (let round = 0; round < rounds; round += 1) {
    await browser.startTracing(page, { path, categories: CATEGORIES });

    await scroller.evaluate((element, delta) => {
      element.scrollTop += delta;
    }, jump);

    await settle(page);
    await browser.stopTracing();
    const parsed: TraceFile = JSON.parse(await readFile(path, 'utf8'));
    samples.push(mainThreadMs(parsed.traceEvents));
  }
  await rm(path, { force: true });
  return samples;
};
