import { describe, expect, it } from 'vite-plus/test';
import { createRandom, fixtureSchema, generateDoc } from '../src/fixtures';

const NONE = {
  paragraph: 0,
  heading: 0,
  list: 0,
  table: 0,
  code: 0,
  image: 0,
  callout: 0,
  toggle: 0,
  columns: 0,
  quote: 0,
  divider: 0,
};

const typesOf = (blocks: number, seed: number): string[] =>
  generateDoc(fixtureSchema, { blocks, seed }).root.content.map((child) =>
    child.kind === 'element' ? child.type : 'text',
  );

describe('fixture documents', () => {
  it('repeats the same document for the same seed and changes it for another', () => {
    const first = generateDoc(fixtureSchema, { blocks: 60, seed: 7 });
    const again = generateDoc(fixtureSchema, { blocks: 60, seed: 7 });

    expect(JSON.stringify(again.root)).toBe(JSON.stringify(first.root));
    expect(typesOf(60, 8)).not.toEqual(typesOf(60, 7));
  });

  it('generates ten thousand valid mixed blocks with paragraphs as the majority', () => {
    const doc = generateDoc(fixtureSchema, { blocks: 10_000, seed: 1 });
    const types = doc.root.content.map((child) => (child.kind === 'element' ? child.type : 'text'));

    const share = (type: string) =>
      types.reduce((count, name) => count + Number(name === type), 0) / types.length;

    expect(types).toHaveLength(10_000);
    expect(fixtureSchema.check(doc.root)).toEqual({ ok: true });
    expect(share('paragraph')).toBeGreaterThan(0.5);
    expect(share('paragraph')).toBeLessThan(0.6);

    expect(new Set(types)).toEqual(
      new Set([
        'paragraph',
        'heading',
        'bullet_list',
        'ordered_list',
        'todo_list',
        'table',
        'code_block',
        'image',
        'callout',
        'toggle',
        'columns',
        'blockquote',
        'divider',
      ]),
    );

    expect(doc.size).toBeGreaterThan(1_000_000);
  });

  it('follows the requested mix and refuses empty ones', () => {
    expect(new Set(typesOf(1, 1))).toEqual(new Set([typesOf(1, 1)[0]]));

    expect(
      new Set(
        generateDoc(fixtureSchema, { blocks: 40, mix: { ...NONE, table: 1 } }).root.content.map(
          (child) => (child.kind === 'element' ? child.type : 'text'),
        ),
      ),
    ).toEqual(new Set(['table']));

    expect(() => generateDoc(fixtureSchema, { blocks: 0 })).toThrow(RangeError);
    expect(() => generateDoc(fixtureSchema, { blocks: 5, mix: NONE })).toThrow(/positive weight/);
  });

  it('draws a repeatable sequence of numbers in the requested ranges', () => {
    const left = createRandom(42);
    const right = createRandom(42);
    const draws = Array.from({ length: 200 }, () => left.int(3, 6));

    expect(Array.from({ length: 200 }, () => right.int(3, 6))).toEqual(draws);
    expect(new Set(draws)).toEqual(new Set([3, 4, 5, 6]));
    expect(createRandom(1).next()).toBeLessThan(1);
    expect(createRandom(5).pick(['only'])).toBe('only');
    expect(createRandom(9).chance(0)).toBe(false);
  });
});
