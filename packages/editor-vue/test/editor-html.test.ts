import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';
import { installPopovers } from './support/popovers';

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

const PARAGRAPH = '<p class="nui-content__paragraph">';

describe('NuiEditor HTML model', () => {
  it('writes the HTML model once typing pauses and right away on blur', async () => {
    const editor = EditorDriver.mount({ modelValue: '<p>Hello</p>' });

    driver = editor;
    editor.focus();
    await editor.select(6);
    await editor.type('!');

    expect(editor.htmls).toEqual([]);
    expect(editor.blockTexts).toEqual(['p:Hello!']);

    await vi.advanceTimersByTimeAsync(300);

    expect(editor.htmls).toEqual([`${PARAGRAPH}Hello!</p>`]);

    await editor.type('?');
    await editor.blur();

    expect(editor.htmls.at(-1)).toBe(`${PARAGRAPH}Hello!?</p>`);
  });

  it('reads HTML set from outside without writing it back', async () => {
    const editor = EditorDriver.mount({ modelValue: '' });

    driver = editor;
    await editor.receiveHTML('<h2>Plan</h2><ul><li>One</li></ul>');
    await vi.advanceTimersByTimeAsync(300);

    expect(editor.blockTexts).toEqual(['h2:Plan', 'ul:One']);
    expect(editor.htmls).toEqual([]);
  });

  it('hands a form the latest HTML when the field commits its drafts', async () => {
    const editor = EditorDriver.mountInField({ modelValue: '<p>Draft</p>' });

    driver = editor;
    editor.focus();
    await editor.select(6);
    await editor.type(' ready');
    editor.commitDrafts();

    expect(editor.htmls).toEqual([`${PARAGRAPH}Draft ready</p>`]);
  });
});
