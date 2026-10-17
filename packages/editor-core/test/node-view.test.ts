import { afterEach, describe, expect, it } from 'vite-plus/test';
import { nodeSize } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditorViewDriver } from './drivers/view';
import { buildWith } from './support/notes';
import { boxViews, type NodeViewLog } from './support/node-views';

const { doc, node } = buildWith(fixtureSchema);

let driver: EditorViewDriver | undefined;

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const mounted = (log: NodeViewLog): EditorViewDriver => {
  driver = EditorViewDriver.mount(
    doc(
      node('callout', [node('paragraph', ['note'])], { tone: 'info' }),
      node('paragraph', ['after']),
    ),
    fixtureSchema,
    [],
    boxViews(log),
  );

  return driver;
};

const calloutId = (view: EditorViewDriver): string => {
  const first = view.view.state.doc.root.content[0];

  return first?.kind === 'element' ? first.id : '';
};

describe('node views', () => {
  it('renders a node through its view and keeps the element when the view accepts new attributes', () => {
    const log: NodeViewLog = { updates: [], destroyed: [] };
    const view = mounted(log);
    const id = calloutId(view);
    const before = view.view.nodeDOM(id);

    expect(view.markup).toBe(
      '<div class="box box--info"><span contenteditable="false" class="box__widget"></span><div><p>note</p></div></div><p>after</p>',
    );

    view.change((tr) => tr.setNodeAttrs(view.positionOf(id), { tone: 'warning' }));

    expect(view.view.nodeDOM(id)).toBe(before);
    expect(before?.className).toBe('box box--warning');
    expect(log.updates).toEqual([`${id}:warning`]);

    view.change((tr) => tr.setNodeAttrs(view.positionOf(id), { tone: 'locked' }));

    expect(view.view.nodeDOM(id)).not.toBe(before);
    expect(log.destroyed).toEqual([id]);
  });

  it('leaves mutations and input inside a widget to the widget', async () => {
    const log: NodeViewLog = { updates: [], destroyed: [] };
    const view = mounted(log);
    const id = calloutId(view);
    const before = view.view.state.doc;
    const paragraph = view.view.nodeDOM(id)?.querySelector('p');

    await view.writeInWidget(id, 'chrome');

    expect(view.view.nodeDOM(id)?.querySelector('p')).toBe(paragraph);

    expect(view.view.nodeDOM(id)?.textContent).toBe('chromenote');
    expect(view.view.state.doc).toBe(before);
    expect(view.typeInWidget(id, 'x')).toBe(false);
    expect(view.view.state.doc).toBe(before);
  });

  it('selects a leaf node from the plain part of its widget but not from its controls', () => {
    driver = EditorViewDriver.mount(
      doc(node('paragraph', ['before']), node('divider')),
      fixtureSchema,
      [],
      boxViews({ updates: [], destroyed: [] }),
    );

    const rule = driver.view.state.doc.root.content[1];
    const id = rule?.kind === 'element' ? rule.id : '';

    expect(driver.pressInWidget(id, 'button')).toBe(false);
    expect(driver.selection.kind).toBe('text');
    expect(driver.pressInWidget(id, '.box__label')).toBe(true);
    expect(driver.selection).toEqual({ kind: 'node', id });
  });

  it('writes the selection of a pressed leaf node to the page only once the button is released', () => {
    driver = EditorViewDriver.mount(
      doc(node('paragraph', ['before']), node('divider')),
      fixtureSchema,
      [],
      boxViews({ updates: [], destroyed: [] }),
    );

    driver.focus();

    const caret = driver.domSpan;

    const rule = driver.view.state.doc.root.content[1];
    const id = rule?.kind === 'element' ? rule.id : '';

    driver.pressInWidget(id, '.box__label');

    expect(driver.selection).toEqual({ kind: 'node', id });
    expect(driver.domSpan).toEqual(caret);

    driver.releaseMouse();

    expect(driver.selectionInside(id)).toBe(true);
  });

  it('keeps a selected leaf between leaves and edits over it from the keyboard', () => {
    driver = EditorViewDriver.mount(
      doc(node('paragraph', ['before']), node('divider'), node('divider')),
      fixtureSchema,
      [],
      boxViews({ updates: [], destroyed: [] }),
    );

    driver.focus();

    const rule = driver.view.state.doc.root.content[2];
    const id = rule?.kind === 'element' ? rule.id : '';

    driver.pressInWidget(id, '.box__label');
    driver.releaseMouse();

    expect(driver.press('Shift')).toBe(false);
    expect(driver.selection).toEqual({ kind: 'node', id });
    expect(driver.press('x')).toBe(true);
    expect(driver.modelTexts).toEqual(['before', '', 'x']);
    expect(driver.selection).toEqual({ kind: 'text', anchor: 11, head: 11 });

    const first = driver.view.state.doc.root.content[1];
    const firstId = first?.kind === 'element' ? first.id : '';

    driver.pressInWidget(firstId, '.box__label');
    driver.releaseMouse();

    expect(driver.press('Backspace')).toBe(true);
    expect(driver.modelTexts).toEqual(['before', 'x']);
  });

  it('destroys views of removed nodes and of the whole document', () => {
    const log: NodeViewLog = { updates: [], destroyed: [] };
    const view = mounted(log);
    const id = calloutId(view);
    const start = view.positionOf(id);
    const first = view.view.state.doc.root.content[0];
    const size = first === undefined ? 0 : nodeSize(first);

    view.change((tr) => tr.delete(start, start + size));

    expect(log.destroyed).toEqual([id]);

    const second = mounted({ updates: [], destroyed: log.destroyed });
    const other = calloutId(second);

    second.destroy();

    expect(log.destroyed).toEqual([id, other]);
  });
});
