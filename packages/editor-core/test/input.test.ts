import { afterEach, describe, expect, it } from 'vite-plus/test';
import { definePlugin, inputSource, textSelection, type InputSource } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditorViewDriver } from './drivers/view';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let driver: EditorViewDriver | undefined;

const mounted = (...args: Parameters<typeof EditorViewDriver.mount>): EditorViewDriver => {
  driver = EditorViewDriver.mount(...args);
  return driver;
};

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const twoParagraphs = () => doc(node('paragraph', ['ab']), node('paragraph', ['cd']));

describe('editor view input', () => {
  it('types through beforeinput into the model and moves the cursor after the text', () => {
    const view = mounted(twoParagraphs());

    view.place(3);

    expect(view.type('xy')).toBe(true);
    expect(view.modelTexts).toEqual(['abxy', 'cd']);
    expect(view.domTexts).toEqual(['abxy', 'cd']);
    expect(view.selection).toEqual(textSelection(5));
    expect(view.domSpan).toEqual({ anchor: 5, head: 5 });
  });

  it('splits on Enter, breaks the line on Shift+Enter and joins blocks on Backspace', () => {
    const view = mounted(twoParagraphs());

    view.place(2);
    view.input('insertParagraph');

    expect(view.modelTexts).toEqual(['a', 'b', 'cd']);

    view.input('insertLineBreak');

    expect(view.markup).toContain('<p><br>b</p>');

    view.place(8);
    view.input('deleteContentBackward');

    expect(view.modelTexts).toEqual(['a', '\ufffcbcd']);
  });

  it('formats the selection, pastes plain text lines as blocks and clears a selected document', () => {
    const view = mounted(twoParagraphs());

    view.place(1, 3);
    view.input('formatBold');

    expect(view.markup).toContain('<p><strong>ab</strong></p>');

    view.place(7);

    expect(view.paste('one\ntwo')).toBe(true);
    expect(view.modelTexts).toEqual(['ab', 'cdone', 'two']);

    view.selectAll();
    view.input('deleteContentBackward');

    expect(view.modelTexts).toEqual(['']);
    expect(view.selection).toEqual(textSelection(1));
  });

  it('reads the DOM selection into the model and writes model selections back to the DOM', () => {
    const view = mounted(twoParagraphs());

    view.focus();
    view.selectInDom(2, 6);

    expect(view.selection).toEqual(textSelection(2, 6));

    view.selectBlocks(0, 1);

    expect(view.selection).toEqual(textSelection(1, 3));

    view.selectRootChildren(0, 1);

    expect(view.selection).toEqual({ kind: 'all' });

    view.place(6);

    expect(view.domSpan).toEqual({ anchor: 6, head: 6 });
  });

  it('keeps a caret the reader has just placed when a change from outside comes before it is read', () => {
    const view = mounted(twoParagraphs());

    view.place(1);
    view.pointInDom(6);
    view.changeOutside((tr) => tr.insertText('x', 3));
    view.changeOutside((tr) => tr.insertText('y', 3));

    expect(view.domSpan).toEqual({ anchor: 8, head: 8 });

    view.noticeSelection();

    expect(view.selection).toEqual(textSelection(8));
  });

  it('keeps a caret the reader has just placed in the text a change from outside rewrites', () => {
    const view = mounted(twoParagraphs());

    view.place(6);
    view.pointInDom(3);
    view.changeOutside((tr) => tr.insertText('xy', 1));
    view.noticeSelection();

    expect(view.domTexts).toEqual(['xyab', 'cd']);
    expect(view.selection).toEqual(textSelection(5));
  });

  it('moves the caret with a change from outside when the reader has not touched it', () => {
    const view = mounted(twoParagraphs());

    view.place(6);
    view.changeOutside((tr) => tr.insertText('xy', 1));

    expect(view.selection).toEqual(textSelection(8));
    expect(view.domSpan).toEqual({ anchor: 8, head: 8 });
  });

  it('leaves the document alone when keys, typing and a paste reach a view that is not editable', () => {
    const view = mounted(twoParagraphs());

    view.setEditable(false);
    view.place(3);
    view.type('x');
    view.press('Backspace');
    view.press('Enter');
    view.paste('pasted');

    expect(view.modelTexts).toEqual(['ab', 'cd']);
    expect(view.domTexts).toEqual(['ab', 'cd']);
  });

  it('still reads a selection made in a view that is not editable', () => {
    const view = mounted(twoParagraphs());

    view.setEditable(false);
    view.focus();
    view.selectInDom(2, 6);

    expect(view.selection).toEqual(textSelection(2, 6));
  });

  it('lets the composition edit the DOM and catches the model up when it ends', async () => {
    const view = mounted(twoParagraphs());

    view.place(3);

    expect(await view.compose('й')).toBe(true);
    expect(view.view.composing).toBe(false);
    expect(view.modelTexts).toEqual(['abй', 'cd']);
    expect(view.domTexts).toEqual(['abй', 'cd']);
    expect(view.selection).toEqual(textSelection(4));
  });

  it('reads a DOM edit made without beforeinput back into the model', async () => {
    const view = mounted(twoParagraphs());

    view.place(7);
    await view.editDom(1, 'cxd');

    expect(view.modelTexts).toEqual(['ab', 'cxd']);
    expect(view.domTexts).toEqual(['ab', 'cxd']);
  });

  it('selects an atom by a click and steps over it with the arrows', () => {
    const mention = node('mention', [], { user: 'u1', label: 'Ann' });
    const view = mounted(doc(node('paragraph', ['a', mention, 'b'])));

    expect(view.clickNode(mention.id)).toBe(true);
    expect(view.selection).toEqual({ kind: 'node', id: mention.id });
    expect(view.selectedNodes).toBe(1);

    view.place(2);

    expect(view.press('ArrowRight')).toBe(true);
    expect(view.selection).toEqual({ kind: 'node', id: mention.id });

    view.press('ArrowRight');

    expect(view.selection).toEqual(textSelection(3));
    expect(view.selectedNodes).toBe(0);
    expect(view.press('ArrowRight')).toBe(false);
  });

  it('selects the whole table when a click lands on one of its cells', () => {
    const cell = node('table_cell', [], { value: 1 });

    const table = node('table', [
      node('table_head', [node('table_column', [], { name: 'A' })]),
      node('table_body', [node('table_row', [cell])]),
    ]);

    const view = mounted(doc(node('paragraph', ['a']), table));

    expect(view.clickNode(cell.id)).toBe(true);
    expect(view.selection).toEqual({ kind: 'node', id: table.id });
  });

  it('lets plugins take keys and intents first and tags transactions with their input source', () => {
    const keys: string[] = [];
    const sources: (InputSource | undefined)[] = [];

    const plugin = definePlugin({
      name: 'probe',
      props: {
        handleKey: (key) => {
          keys.push(key.key);
          return key.key === 'Tab';
        },
        handleIntent: (intent, state, dispatch) => {
          if (intent.kind !== 'insertText' || intent.text !== '!') {
            return false;
          }
          dispatch(state.tr.insertText('?', 1));
          return true;
        },
      },
      filterTransaction: (tr) => {
        sources.push(inputSource.read(tr));
        return true;
      },
    });

    const view = mounted(twoParagraphs(), fixtureSchema, [plugin]);

    view.place(3);

    expect(view.press('Tab')).toBe(true);
    expect(view.press('x')).toBe(false);

    view.type('!');
    view.type('z');

    expect(keys).toEqual(['Tab', 'x']);
    expect(view.modelTexts).toEqual(['?abz', 'cd']);
    expect(sources).toEqual([undefined, 'type', 'type']);
  });

  it('measures the caret from a collapsed range or from the character beside it', () => {
    const view = mounted(doc(node('paragraph', ['abc']), node('paragraph')));

    view.layText({ collapsedHeight: 20 });

    expect(view.view.coordsAtPos(3)).toEqual({ left: 20, right: 20, top: 0, bottom: 20 });

    view.destroy();
    const flat = mounted(doc(node('paragraph', ['abc']), node('paragraph')));

    flat.layText({ collapsedHeight: 0 });

    expect(flat.view.coordsAtPos(3)).toEqual({ left: 20, right: 20, top: 0, bottom: 20 });
    expect(flat.view.coordsAtPos(1)).toEqual({ left: 0, right: 0, top: 0, bottom: 20 });
    expect(flat.view.coordsAtPos(6)).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });

  it('takes the caret from the leading edge of a right-to-left character', () => {
    const view = mounted(doc(node('paragraph', ['ابج']), node('paragraph')));

    view.layText({ collapsedHeight: 0 });

    expect(view.view.coordsAtPos(3)).toEqual({ left: 10, right: 10, top: 0, bottom: 20 });
    expect(view.view.coordsAtPos(1)).toEqual({ left: 10, right: 10, top: 0, bottom: 20 });
  });

  it('finds the position under a point through whichever caret API the browser has', () => {
    const view = mounted(twoParagraphs());

    view.caretFrom('position', 'cd', 1);

    expect(view.view.posAtCoords(5, 5)).toBe(6);

    view.caretFrom('range', 'ab', 2);

    expect(view.view.posAtCoords(5, 5)).toBe(3);

    view.caretFrom('range', undefined, 0);

    expect(view.view.posAtCoords(5, 5)).toBeUndefined();

    view.caretFrom('none', 'ab', 0);

    expect(view.view.posAtCoords(5, 5)).toBeUndefined();
  });

  it('pastes clipboard HTML as blocks and copies a selection as text and marked markup', () => {
    const view = mounted(twoParagraphs());

    view.place(2);

    expect(view.paste('x\ny', '<ul><li>x</li></ul><p><b>y</b></p>')).toBe(true);
    expect(view.markup).toContain('<p>a</p><ul><li><p>x</p></li></ul><p><strong>y</strong>b</p>');

    view.place(11, 16);

    expect(view.copy('copy')).toBe('yb\nc');

    expect(view.copy('copy', 'text/html')).toBe(
      '<div data-numior-editor="1"><p><strong>y</strong>b</p><p>c</p></div>',
    );

    expect(view.copy('cut')).toBe('yb\nc');
    expect(view.markup).toContain('<p>a</p><ul><li><p>x</p></li></ul><p>d</p>');
  });

  it('copies line breaks and mentions into the plain text of the clipboard', () => {
    const view = mounted(
      doc(
        node('paragraph', [
          'one',
          node('hard_break'),
          'two ',
          node('mention', [], { user: 'u1', label: 'Ann' }),
        ]),
        node('divider'),
        node('paragraph', ['three']),
      ),
    );

    view.focus();
    view.selectAll();

    expect(view.copy('copy')).toBe('one\ntwo @Ann\nthree');
  });

  it('keeps a whole-document selection in the model and copies, cuts and leaves it by itself', () => {
    const view = mounted(twoParagraphs());

    view.focus();
    view.selectAll();

    expect(view.selectsAll).toBe(true);
    expect(view.domSpan).toEqual({ anchor: 1, head: 1 });
    expect(view.copy('copy')).toBe('ab\ncd');
    expect(view.press('ArrowRight')).toBe(true);
    expect(view.selection).toEqual(textSelection(7));
    expect(view.selectsAll).toBe(false);

    view.selectAll();

    expect(view.copy('cut')).toBe('ab\ncd');
    expect(view.modelTexts).toEqual(['']);

    view.type('ab');
    view.selectAll();

    expect(view.press('Backspace')).toBe(true);
    expect(view.modelTexts).toEqual(['']);

    view.type('x');
    view.selectAll();
    view.type('y');

    expect(view.modelTexts).toEqual(['y']);
    expect(view.copy('copy')).toBeUndefined();
  });
});
