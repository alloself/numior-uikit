import { contentSchema } from '@numior/content';
import { createDoc, selectAll, toJSON } from '@numior/editor-core';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';

let driver: EditorDriver | undefined;

const mounted = (...args: Parameters<typeof EditorDriver.mount>): EditorDriver => {
  driver = EditorDriver.mount(...args);
  return driver;
};

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const note = (text: string) =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [
          contentSchema.element('paragraph', { id: 'p', content: [contentSchema.text(text)] }),
        ],
      }),
    ),
  );

describe('NuiEditor', () => {
  it('starts empty with its placeholder and types into v-model:document', async () => {
    const editor = mounted({ placeholder: 'Напишите заметку' });

    expect(editor.classes).toContain('nui-editor--empty');
    expect(editor.attribute('role')).toBe('textbox');
    expect(editor.attribute('aria-placeholder')).toBe('Напишите заметку');
    expect(editor.attribute('contenteditable')).toBe('true');

    await editor.type('Hi');

    expect(editor.text).toBe('Hi');
    expect(editor.classes).not.toContain('nui-editor--empty');

    expect(editor.documents.at(-1)?.root.content).toEqual([
      expect.objectContaining({ type: 'paragraph', content: [{ text: 'Hi' }] }),
    ]);

    expect(editor.changes).toBe(1);
  });

  it('publishes the document once per frame after the paint and right away on blur', async () => {
    const editor = mounted();

    editor.focus();
    await editor.type('Hi');

    expect(editor.emittedSoFar('change')).toBe(0);

    await editor.nextPaint();

    expect(editor.emittedSoFar('change')).toBe(1);

    await editor.type('!');
    await editor.blur();

    expect(editor.emittedSoFar('change')).toBe(2);
    expect(editor.emittedSoFar('update:modelValue')).toBe(2);
  });

  it('keeps its history over its own echoes and starts over on a new document', async () => {
    const editor = mounted({ document: note('Old') });

    expect(editor.text).toBe('Old');

    await editor.type('!');
    await editor.press('z', { ctrl: true });

    expect(editor.text).toBe('Old');

    await editor.receive({ document: note('New') });

    expect(editor.text).toBe('New');

    await editor.press('z', { ctrl: true });

    expect(editor.text).toBe('New');
  });

  it('turns markdown into blocks and undoes it with Ctrl+Z', async () => {
    const editor = mounted();

    await editor.type('# Title');

    expect(editor.markup).toContain('<h1');

    await editor.press('z', { ctrl: true });
    await editor.press('z', { ctrl: true });

    expect(editor.markup).not.toContain('<h1');
  });

  it('names itself by the field label, reports errors and follows readonly and disabled', async () => {
    const editor = mounted({ label: 'Описание', description: 'Пара строк', error: 'Обязательно' });
    const labelledBy = editor.attribute('aria-labelledby') ?? '';

    expect(editor.textOf(labelledBy)).toBe('Описание');
    expect(editor.attribute('aria-describedby')?.split(' ')).toHaveLength(2);
    expect(editor.attribute('aria-invalid')).toBe('true');
    expect(editor.classes).toContain('nui-editor--invalid');

    await editor.receive({ readonly: true });

    expect(editor.attribute('contenteditable')).toBe('false');
    expect(editor.attribute('aria-readonly')).toBe('true');

    await editor.receive({ readonly: false, disabled: true });

    expect(editor.attribute('aria-disabled')).toBe('true');
    expect(editor.classes).toContain('nui-editor--disabled');
  });

  it('exposes commands and focus and reports focus changes', async () => {
    const editor = mounted({ document: note('Text') });

    editor.focus();

    expect(editor.focused).toBe(true);
    expect(editor.run(selectAll)).toBe(true);

    await editor.blur();

    expect(editor.emitted('focus')).toBe(1);
    expect(editor.emitted('blur')).toBe(1);
  });

  it('mounts its closed overlays on the first focus or pointer move, not with the document', async () => {
    const focused = mounted({ document: note('Text') });

    expect(focused.overlaid).toBe(false);

    await focused.focusIn();

    expect(focused.overlaid).toBe(true);

    focused.destroy();

    const hovered = mounted({ document: note('Text') });

    await hovered.hoverGap();

    expect(hovered.overlaid).toBe(true);
  });

  it('renders the document on the server and hands it to the editor after hydration', async () => {
    const html = await EditorDriver.ssr({ document: note('Server') });

    expect(html).toContain('nui-editor__static');
    expect(html).toContain('<p class="nui-content__paragraph">Server</p>');
    expect(await EditorDriver.hydrate({ document: note('Server') })).toEqual([]);
  });
});
