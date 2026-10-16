import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type ContentNode, type ElementNode } from '@numior/editor-core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { EditorDriver } from './drivers/editor';
import { installPopovers } from './support/popovers';

let driver: EditorDriver | undefined;

const mounted = (...args: Parameters<typeof EditorDriver.mount>): EditorDriver => {
  driver = EditorDriver.mount(...args);
  return driver;
};

beforeAll(() => {
  installPopovers();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const element = (
  type: string,
  id: string,
  content: readonly (ContentNode | string)[] = [],
  attrs = {},
): ElementNode =>
  contentSchema.element(type, {
    id,
    attrs,
    content: content.map((child) =>
      typeof child === 'string' ? contentSchema.text(child) : child,
    ),
  });

const documentOf = (...blocks: readonly ElementNode[]) =>
  toJSON(createDoc(contentSchema, contentSchema.element('doc', { id: 'root', content: blocks })));

const todos = () =>
  documentOf(
    element('todo_list', 'l', [
      element('todo_item', 't1', [element('paragraph', 'p1', ['Ship'])]),
      element('todo_item', 't2', [element('paragraph', 'p2', ['Test'])], { checked: true }),
    ]),
  );

const folded = () =>
  documentOf(
    element('toggle', 'g', [
      element('paragraph', 's', ['Details']),
      element('paragraph', 'b', ['Hidden']),
    ]),
    element('paragraph', 'after', ['After']),
  );

const callout = () =>
  documentOf(element('callout', 'c', [element('paragraph', 'cp', ['Note'])], { tone: 'info' }));

describe('NuiEditor built-in blocks', () => {
  it('checks to-dos from their box and from Ctrl+Enter, one undo step each', async () => {
    const editor = mounted({ document: todos() });

    await editor.showBlocks();

    expect(editor.labelOf('.nui-editor__widget input')).toBe('Done: Ship');

    await editor.hoverWidget(0);

    expect(editor.handleShown).toBe(false);

    await editor.clickControl('.nui-editor__widget input');

    expect(editor.classesOf('li', 0)).toContain('nui-content__todo--checked');

    editor.focus();
    await editor.select(4);
    await editor.press('Enter', { ctrl: true });

    expect(editor.classesOf('li', 0)).not.toContain('nui-content__todo--checked');

    await editor.press('z', { ctrl: true });

    expect(editor.classesOf('li', 0)).toContain('nui-content__todo--checked');
  });

  it('folds a toggle for this reader only and leaves a closed summary with Enter', async () => {
    const editor = mounted({ document: folded() });

    await editor.showBlocks();
    const changes = editor.changes;

    expect(editor.classesOf('.nui-content__toggle')).not.toContain('nui-content__toggle--open');
    expect(editor.labelOf('.nui-editor__widget button')).toBe('Expand');

    await editor.clickControl('.nui-editor__widget button');

    expect(editor.classesOf('.nui-content__toggle')).toContain('nui-content__toggle--open');
    expect(editor.labelOf('.nui-editor__widget button')).toBe('Collapse');
    expect(editor.changes).toBe(changes);

    await editor.clickControl('.nui-editor__widget button');
    editor.focus();
    await editor.select(9);
    await editor.press('Enter');

    expect(editor.blockTexts).toEqual(['div:DetailsHidden', 'p:', 'p:After']);

    await editor.hoverBlock(0);
    await editor.blockAction('Open by default');

    expect(editor.classesOf('.nui-content__toggle')).toContain('nui-content__toggle--open');
  });

  it('changes the callout tone from its icon and from the handle menu', async () => {
    const editor = mounted({ document: callout() });

    await editor.showBlocks();

    expect(editor.labelOf('.nui-editor__widget button')).toBe('Callout tone: Info');

    await editor.clickControl('.nui-editor__widget button');
    await editor.chooseInWidget('Warning');

    expect(editor.classesOf('.nui-content__callout')).toContain(
      'nui-content__callout--tone-warning',
    );

    await editor.hoverBlock(0);
    await editor.blockAction('Tone', 'Error');

    expect(editor.classesOf('.nui-content__callout')).toContain('nui-content__callout--tone-error');
    expect(editor.labelOf('.nui-editor__widget button')).toBe('Callout tone: Error');
  });
});
