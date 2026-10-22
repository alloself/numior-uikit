import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type DocJSON, type NodeJSON } from '@numior/editor-core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { NuiEditorMention, NuiEditorMentions } from '../src';
import { EditorDriver } from './drivers/editor';
import { EditorMentionsDriver } from './drivers/editor-mentions';
import { installPopovers } from './support/popovers';

interface Lookup {
  readonly query: string;
  readonly signal: AbortSignal;
  readonly answer: (people: readonly NuiEditorMention[]) => void;
  readonly fail: () => void;
}

let driver: EditorDriver | undefined;

beforeAll(() => {
  installPopovers();
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
  vi.useRealTimers();
});

const PEOPLE: readonly NuiEditorMention[] = [
  { id: 'anna', label: 'Anna Kuznetsova', description: 'Design' },
  { id: 'ivan', label: 'Ivan Petrov', avatar: '/ivan.png' },
  { id: 'olga', label: 'Olga Smirnova' },
];

const directory = (): { readonly search: NuiEditorMentions; readonly lookups: Lookup[] } => {
  const lookups: Lookup[] = [];

  const search: NuiEditorMentions = (query, { signal }) =>
    new Promise((resolve, reject) => {
      lookups.push({
        query,
        signal,
        answer: resolve,
        fail: () => {
          reject(new Error('offline'));
        },
      });
    });

  return { search, lookups };
};

const matching = (query: string): readonly NuiEditorMention[] =>
  PEOPLE.filter((person) => person.label.toLowerCase().includes(query.toLowerCase()));

const empty = (): DocJSON =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [
          contentSchema.element('paragraph', { id: 'p', content: [contentSchema.text('Hi ')] }),
        ],
      }),
    ),
  );

const inline = (document: DocJSON | undefined): readonly string[] => {
  const paragraph = document?.root.content?.[0];

  const content: readonly NodeJSON[] =
    paragraph !== undefined && 'content' in paragraph ? (paragraph.content ?? []) : [];

  return content.map((node) =>
    'text' in node ? node.text : `@${String(node.attrs?.user)}:${String(node.attrs?.label)}`,
  );
};

const typing = async (search?: NuiEditorMentions): Promise<EditorDriver> => {
  driver = EditorDriver.mount({ document: empty(), mentions: search });
  driver.focus();
  await driver.select(4);
  return driver;
};

describe('NuiEditor mentions', () => {
  it('asks once the typing pauses and inserts the chosen person as a mention', async () => {
    const people = directory();
    const editor = await typing(people.search);
    const mentions = EditorMentionsDriver.of(editor);

    await editor.type('@an');

    expect(mentions.shown).toBe(true);
    expect(mentions.status).toBe('Searching…');
    expect(people.lookups).toEqual([]);

    await mentions.pause(150);

    expect(people.lookups.map((lookup) => lookup.query)).toEqual(['an']);

    people.lookups[0]?.answer(matching('an'));
    await mentions.pause(0);

    expect(mentions.options).toEqual(['AK|Anna Kuznetsova|Design', 'picture|Ivan Petrov|']);
    expect(mentions.active).toBe('Anna Kuznetsova');

    await editor.press('ArrowDown');

    expect(mentions.active).toBe('Ivan Petrov');

    await editor.press('Enter');

    expect(inline(editor.documents.at(-1))).toEqual(['Hi ', '@ivan:Ivan Petrov', ' ']);
    expect(mentions.shown).toBe(false);
  });

  it('drops a stale search, says when nobody is found or the search fails and closes on Escape', async () => {
    const people = directory();
    const editor = await typing(people.search);
    const mentions = EditorMentionsDriver.of(editor);

    await editor.type('@o');
    await mentions.pause(150);
    await editor.type('x');

    expect(people.lookups[0]?.signal.aborted).toBe(true);

    await mentions.pause(150);
    people.lookups[0]?.answer(PEOPLE);
    people.lookups[1]?.answer([]);
    await mentions.pause(0);

    expect(mentions.options).toEqual([]);
    expect(mentions.status).toBe('Nobody found');

    await mentions.erase();
    await mentions.pause(150);
    people.lookups[2]?.fail();
    await mentions.pause(0);

    expect(mentions.status).toBe('People could not be loaded');

    await editor.press('Escape');

    expect(mentions.shown).toBe(false);
    expect(inline(editor.documents.at(-1))).toEqual(['Hi @o']);
  });

  it('chooses with the pointer and leaves @ alone without a search adapter', async () => {
    const people = directory();
    const editor = await typing(people.search);
    const mentions = EditorMentionsDriver.of(editor);

    await editor.type('@');
    await mentions.pause(150);
    people.lookups[0]?.answer(PEOPLE);
    await mentions.pause(0);
    await mentions.choose('Olga Smirnova');

    expect(inline(editor.documents.at(-1))).toEqual(['Hi ', '@olga:Olga Smirnova', ' ']);

    editor.destroy();

    const plain = await typing();

    await plain.type('@an');
    await EditorMentionsDriver.of(plain).pause(150);

    expect(EditorMentionsDriver.of(plain).shown).toBe(false);
    expect(inline(plain.documents.at(-1))).toEqual(['Hi @an']);
  });
});
