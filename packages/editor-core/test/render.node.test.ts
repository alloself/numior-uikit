import { describe, expect, it } from 'vitest';
import { contentHole, createSchema, renderTag } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { buildWith } from './support/notes';

const { node } = buildWith(fixtureSchema);

describe('render specs', () => {
  it('writes attributes as strings and drops empty ones', () => {
    expect(
      renderTag('ol', { start: 3, reversed: true, hidden: false, title: null, lang: undefined }, [
        'x',
        contentHole,
      ]),
    ).toEqual({
      kind: 'element',
      tag: 'ol',
      attrs: { start: '3', reversed: '' },
      children: [{ kind: 'text', text: 'x' }, { kind: 'hole' }],
    });
  });

  it('gives node and mark types a default render that a restricted schema keeps', () => {
    const plain = createSchema({
      nodes: {
        doc: { content: 'block+' },
        block: { group: 'block', content: 'inline*' },
        rule: { group: 'block' },
        text: { group: 'inline', inline: true },
        chip: { group: 'inline', inline: true },
      },
      marks: { strong: {} },
    });

    const build = buildWith(plain);
    const narrow = fixtureSchema.restrict({ nodes: ['paragraph', 'heading'], marks: ['bold'] });

    expect(plain.nodes.get('block')?.render(build.node('block'))).toEqual(
      renderTag('div', {}, [contentHole]),
    );

    expect(plain.nodes.get('rule')?.render(build.node('rule'))).toEqual(renderTag('div'));
    expect(plain.nodes.get('chip')?.render(build.node('chip'))).toEqual(renderTag('span'));

    expect(plain.marks.get('strong')?.render(plain.mark('strong'))).toEqual(
      renderTag('span', {}, [contentHole]),
    );

    expect(narrow.nodes.get('heading')?.render(node('heading', [], { level: 3 }))).toEqual(
      renderTag('h3'),
    );

    expect(narrow.marks.get('bold')?.render(fixtureSchema.mark('bold'))).toEqual(
      renderTag('strong'),
    );
  });
});
