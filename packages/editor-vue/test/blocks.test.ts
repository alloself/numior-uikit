import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';
import { blockDocument, blockSchema, testBlocks } from './support/blocks';
import { installPopovers } from './support/popovers';

let driver: EditorDriver | undefined;

const mounted = (): EditorDriver => {
  driver = EditorDriver.mount({
    document: blockDocument(),
    schema: blockSchema,
    blocks: testBlocks,
  });

  return driver;
};

beforeAll(() => {
  installPopovers();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

describe('NuiEditor blocks', () => {
  it('mounts block views into their nodes and keeps the node element across attribute changes', async () => {
    const editor = mounted();

    await editor.showBlocks();

    expect(editor.widgetTexts).toEqual(['info 0', 'stamp final']);

    const callout = editor.blockElement(0);

    await editor.clickWidget(0);

    expect(editor.widgetTexts).toEqual(['warning 1', 'stamp final']);
    expect(editor.blockElement(0)).toBe(callout);
    expect(callout?.className).toContain('nui-content__callout--tone-warning');
    expect(editor.text).toContain('note');
  });

  it('adds block keys, slash items and handle menu entries', async () => {
    const editor = mounted();

    await editor.showBlocks();
    editor.focus();
    await editor.select(15);
    await editor.press('s', { ctrl: true, alt: true });

    expect(editor.widgetTexts).toEqual(['info 0', 'stamp final', 'stamp draft']);

    await editor.type('/box');

    expect(editor.slashOptions).toEqual(['Box']);

    await editor.hoverBlock(0);
    await editor.blockAction('Make error');

    expect(editor.widgetTexts[0]).toBe('error 0');
  });
});
