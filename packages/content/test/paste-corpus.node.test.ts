import { readFileSync, readdirSync } from 'node:fs';
import { clipboardHTML, detectPasteSource, fromHTML, toJSON } from '@numior/editor-core';
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
    Object.entries(value).reduce<[string, unknown][]>((kept, [key, inner]) => {
      if (key !== 'id') {
        kept.push([key, stripIds(inner)]);
      }
      return kept;
    }, []),
  );
};

const samples = readdirSync(CORPUS).flatMap((source) =>
  readdirSync(new URL(`${source}/`, CORPUS)).reduce<{ source: string; name: string }[]>(
    (found, file) => {
      if (file.endsWith('.html')) {
        found.push({ source, name: file.replace('.html', '') });
      }
      return found;
    },
    [],
  ),
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
    expect(detectPasteSource(clipboardHTML(contentSchema, []))).toBe('own');
    expect(detectPasteSource('<div data-numior-editor="1"><p>a</p></div>')).toBe('html');
    expect(detectPasteSource('<p>a</p>')).toBe('html');
  });
});
