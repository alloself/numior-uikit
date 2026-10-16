import { readFileSync, readdirSync } from 'node:fs';
import { detectPasteSource, fromHTML, toJSON } from '@numior/editor-core';
import { describe, expect, it } from 'vite-plus/test';
import { contentSchema } from '../src';

const CORPUS = new URL('../../../tests/e2e/fixtures/paste/', import.meta.url);

const stripIds = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripIds);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'id')
      .map(([key, inner]) => [key, stripIds(inner)]),
  );
};

const samples = readdirSync(CORPUS).flatMap((source) =>
  readdirSync(new URL(`${source}/`, CORPUS))
    .filter((file) => file.endsWith('.html'))
    .map((file) => ({ source, name: file.replace('.html', '') })),
);

const read = (source: string, file: string): string =>
  readFileSync(new URL(`${source}/${file}`, CORPUS), 'utf8');

describe('paste corpus', () => {
  it.each(samples)('recognises $source/$name and reads it into the expected blocks', (sample) => {
    const html = read(sample.source, `${sample.name}.html`);
    const expected: unknown = JSON.parse(read(sample.source, `${sample.name}.expected.json`));

    expect(detectPasteSource(html)).toBe(sample.source);
    expect(stripIds(toJSON(fromHTML(contentSchema, html)).root.content)).toEqual(expected);
  });

  it('covers every office source', () => {
    expect(new Set(samples.map((sample) => sample.source))).toEqual(
      new Set(['word', 'google-docs', 'excel', 'sheets']),
    );
  });

  it('tells plain text, own markup and other pages apart', () => {
    expect(detectPasteSource('  ')).toBe('text');
    expect(detectPasteSource('<div data-numior-editor="1"><p>a</p></div>')).toBe('own');
    expect(detectPasteSource('<p>a</p>')).toBe('html');
  });
});
