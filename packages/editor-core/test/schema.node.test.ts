import { describe, expect, it } from 'vite-plus/test';
import { createSchema } from '../src';
import { buildWith, notes } from './support/notes';

describe('schema', () => {
  it('fills attribute defaults and refuses unknown, missing and invalid attributes', () => {
    expect(notes.element('heading', { id: 'h' }).attrs).toEqual({ level: 1 });
    expect(notes.element('heading', { id: 'h', attrs: { level: 2 } }).attrs).toEqual({ level: 2 });

    expect(() => notes.element('heading', { id: 'h', attrs: { size: 2 } })).toThrow(
      /Unknown attribute "size"/,
    );

    expect(() => notes.element('image', { id: 'i' })).toThrow(/Missing attribute "src"/);

    expect(() => notes.element('heading', { id: 'h', attrs: { level: 7 } })).toThrow(
      /Invalid attribute "level"/,
    );

    expect(() => notes.mark('link')).toThrow(/Missing attribute "href"/);
    expect(() => notes.mark('underline')).toThrow(/Unknown mark "underline"/);
  });

  it('sizes elements, normalizes their text and keeps leaves empty', () => {
    const paragraph = notes.element('paragraph', {
      id: 'p',
      content: [
        notes.text('ab'),
        notes.text(''),
        notes.text('cd'),
        notes.text('!', [notes.mark('bold')]),
      ],
    });

    expect(
      paragraph.content.map((child) => (child.kind === 'text' ? child.text : child.type)),
    ).toEqual(['abcd', '!']);

    expect(paragraph.size).toBe(7);

    expect(notes.element('image', { id: 'i', attrs: { src: 'a.png' } })).toMatchObject({
      leaf: true,
      size: 1,
    });

    expect(() =>
      notes.element('image', { id: 'i', attrs: { src: 'a.png' }, content: [notes.text('x')] }),
    ).toThrow(/cannot hold content/);

    expect(() => notes.element('text', { id: 'x' })).toThrow(/Unknown element type "text"/);
    expect(() => notes.element('figure', { id: 'x' })).toThrow(/Unknown element type "figure"/);
    expect(() => notes.element('paragraph', { id: '' })).toThrow(/needs an id/);
  });

  it('orders marks by the schema and keeps one mark of a type', () => {
    const link = notes.mark('link', { href: '/a' });

    const text = notes.text('x', [
      link,
      notes.mark('italic'),
      notes.mark('bold'),
      notes.mark('link', { href: '/b' }),
    ]);

    expect(text.marks.map((mark) => mark.type)).toEqual(['bold', 'italic', 'link']);
    expect(text.marks.at(-1)?.attrs).toEqual({ href: '/b' });
  });

  it('allows marks by name, group, all or none and only in inline content by default', () => {
    const schema = createSchema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'text*' },
        title: { group: 'block', content: 'text*', marks: 'format' },
        caption: { group: 'block', content: 'text*', marks: 'link' },
        plain: { group: 'block', content: 'text*', marks: '' },
        wrap: { group: 'block', content: 'block+', marks: '_' },
        box: { group: 'block', content: 'block+' },
        text: { inline: true },
      },
      marks: { bold: { group: 'format' }, italic: { group: 'format' }, link: {} },
    });

    const allowed = (type: string) => [...(schema.nodes.get(type)?.marks ?? [])];

    expect(allowed('paragraph')).toEqual(['bold', 'italic', 'link']);
    expect(allowed('title')).toEqual(['bold', 'italic']);
    expect(allowed('caption')).toEqual(['link']);
    expect(allowed('plain')).toEqual([]);
    expect(allowed('wrap')).toEqual(['bold', 'italic', 'link']);
    expect(allowed('box')).toEqual([]);

    expect(schema.nodes.get('paragraph')).toMatchObject({
      inlineContent: true,
      leaf: false,
      inline: false,
    });

    expect(schema.nodes.get('text')).toMatchObject({ inline: true, leaf: true });
  });

  it('restricts node types and marks and drops types that can no longer be valid', () => {
    const limited = notes.restrict({ nodes: ['paragraph', 'list'], marks: ['bold'] });

    expect([...limited.nodes.keys()]).toEqual(['doc', 'paragraph', 'text']);
    expect([...limited.marks.keys()]).toEqual(['bold']);
    expect([...(limited.nodes.get('paragraph')?.marks ?? [])]).toEqual(['bold']);
    expect(limited.nodes.get('doc')?.content.matchType('heading')).toBeUndefined();
    expect(() => limited.restrict({ nodes: ['heading'] })).toThrow(/top node "doc"/);
    expect(() => limited.restrict({ nodes: [] }).top).toThrow(/top node "doc"/);
    expect(() => notes.restrict({ nodes: ['figure'] })).toThrow(/Unknown node type "figure"/);
    expect(() => notes.restrict({ marks: ['shadow'] })).toThrow(/Unknown mark "shadow"/);
    expect([...notes.restrict({}).nodes.keys()]).toEqual([...notes.nodes.keys()]);
  });

  it('refuses a schema without a top node or with unknown marks', () => {
    expect(() =>
      createSchema({ nodes: { paragraph: { content: 'text*' }, text: { inline: true } } }),
    ).toThrow(/top node "doc"/);

    expect(() =>
      createSchema({ nodes: { doc: { content: 'text*', marks: 'glow' }, text: { inline: true } } }),
    ).toThrow(/Unknown mark or mark group "glow"/);

    expect(
      createSchema({ top: 'page', nodes: { page: { content: 'text*' }, text: { inline: true } } })
        .top.name,
    ).toBe('page');
  });

  it('builds documents through the factories of the schema', () => {
    const { doc, node, text } = buildWith();
    const root = doc(node('paragraph', ['Hello ', text('world', [notes.mark('bold')])]));

    expect(root.type).toBe('doc');
    expect(root.size).toBe(15);
  });
});
