import { afterEach, describe, expect, it } from 'vite-plus/test';
import { definePlugin, history, inputSource, textSelection, undo, type InputSource } from '../src';
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

  it('moves the selected text to where it is dropped and takes the move back in one step', () => {
    const view = mounted(twoParagraphs(), fixtureSchema, [history()]);

    view.place(1, 3);

    expect(view.dragSelectionTo('cd', 1)).toEqual({
      started: true,
      offered: true,
      effect: 'copyMove',
    });

    expect(view.modelTexts).toEqual(['', 'cabd']);
    expect(view.domTexts).toEqual(['', 'cabd']);
    expect(view.selection).toEqual(textSelection(6));

    view.run(undo);

    expect(view.modelTexts).toEqual(['ab', 'cd']);
  });

  it('moves text forward and backward inside one line', () => {
    const view = mounted(doc(node('paragraph', ['abcdef'])));

    view.place(1, 3);
    view.dragSelectionTo('abcdef', 5);

    expect(view.modelTexts).toEqual(['cdeabf']);

    view.place(4, 6);
    view.dragSelectionTo('cdeabf', 0);

    expect(view.modelTexts).toEqual(['abcdef']);
  });

  it('leaves a copy behind when the text is dropped with Ctrl held', () => {
    const view = mounted(twoParagraphs());

    view.place(1, 3);
    view.dragSelectionTo('cd', 2, { copy: true });

    expect(view.modelTexts).toEqual(['ab', 'cdab']);
  });

  it('changes nothing when the text is dropped onto itself', () => {
    const view = mounted(doc(node('paragraph', ['abcdef'])));

    view.place(2, 5);
    view.dragSelectionTo('abcdef', 2);

    expect(view.modelTexts).toEqual(['abcdef']);
    expect(view.selection).toEqual(textSelection(2, 5));
  });

  it('does not start a drag without selected text or from outside the selection', () => {
    const view = mounted(twoParagraphs());

    view.place(2);

    expect(view.dragSelectionTo('cd', 1).started).toBe(false);

    view.place(1, 3);

    expect(view.dragSelectionTo('ab', 0, { from: view.blocks[1] }).started).toBe(false);
    expect(view.modelTexts).toEqual(['ab', 'cd']);
  });

  it('lets a reader drag text out of a view that is not editable and keeps the text', () => {
    const view = mounted(twoParagraphs());

    view.setEditable(false);
    view.focus();
    view.selectInDom(1, 3);

    expect(view.dragSelectionTo('cd', 1).effect).toBe('copy');
    expect(view.modelTexts).toEqual(['ab', 'cd']);
  });

  it('still reads a selection made in a view that is not editable', () => {
    const view = mounted(twoParagraphs());

    view.setEditable(false);
    view.focus();
    view.selectInDom(2, 6);

    expect(view.selection).toEqual(textSelection(2, 6));
  });

  it('follows the browser when it joins two lines in the middle of a composition', async () => {
    const view = mounted(twoParagraphs());

    view.place(4);
    await view.composeJoining(1);

    expect(view.modelTexts).toEqual(['abcd']);
    expect(view.domTexts).toEqual(['abcd']);
    expect(view.selection).toEqual(textSelection(3));
  });

  it('keeps what a composition wrote at the place where the browser joined two lines', async () => {
    const view = mounted(
      doc(node('paragraph', ['ab']), node('paragraph', ['cd']), node('paragraph', ['ef'])),
    );

    view.place(4);
    await view.composeJoining(1, 'й');

    expect(view.modelTexts).toEqual(['abйcd', 'ef']);
    expect(view.domTexts).toEqual(['abйcd', 'ef']);
    expect(view.selection).toEqual(textSelection(4));
  });

  it('leaves the text being composed in its place when a change from outside lands earlier in the line', async () => {
    const view = mounted(twoParagraphs());

    view.place(3);
    await view.startComposing('й');
    view.changeOutside((tr) => tr.insertText('xy', 1));

    expect(view.domTexts).toEqual(['xyabй', 'cd']);
    expect(view.domSpan).toEqual({ anchor: 6, head: 6 });

    await view.finishComposing();

    expect(view.modelTexts).toEqual(['xyabй', 'cd']);
    expect(view.selection).toEqual(textSelection(6));
  });

  it('puts a change from outside after the text being composed at the same place', async () => {
    const view = mounted(twoParagraphs());

    view.place(3);
    await view.startComposing('й');
    view.changeOutside((tr) => tr.insertText('xy', 3));

    expect(view.domTexts).toEqual(['abйxy', 'cd']);
    expect(view.domSpan).toEqual({ anchor: 4, head: 4 });

    await view.finishComposing();

    expect(view.modelTexts).toEqual(['abйxy', 'cd']);
    expect(view.selection).toEqual(textSelection(4));
  });

  it('keeps the text being composed through a change from outside that deletes the letter before it', async () => {
    const view = mounted(twoParagraphs());

    view.place(3);
    await view.startComposing('й');
    view.changeOutside((tr) => tr.delete(2, 3));

    expect(view.domTexts).toEqual(['aй', 'cd']);

    await view.finishComposing();

    expect(view.modelTexts).toEqual(['aй', 'cd']);
    expect(view.selection).toEqual(textSelection(3));
  });

  it('goes on reading what is typed when the keyboard commits without ending its composition', async () => {
    const view = mounted(twoParagraphs());

    view.place(3);
    await view.startComposing('й');
    await view.commitUnannounced('z');

    expect(view.view.composing).toBe(false);
    expect(view.modelTexts).toEqual(['abйz', 'cd']);
    expect(view.domTexts).toEqual(['abйz', 'cd']);
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

  it('deletes a picture from the place after it with a keyboard that names no keys', () => {
    const image = node('image', [], { src: 'a.png' });
    const view = mounted(doc(node('paragraph', ['ab']), image, node('paragraph', ['cd'])));

    view.focus();
    view.change((tr) => tr.setSelection({ kind: 'gap', id: image.id, side: 'end' }));
    view.press('Unidentified');
    view.input('deleteContentBackward');

    expect(view.selection).toEqual({ kind: 'node', id: image.id });

    view.press('Unidentified');
    view.input('deleteContentBackward');

    expect(view.modelTexts).toEqual(['ab', 'cd']);
  });

  it('writes in the place after a picture with a keyboard that names no keys', () => {
    const image = node('image', [], { src: 'a.png' });
    const view = mounted(doc(node('paragraph', ['ab']), image));

    view.focus();
    view.change((tr) => tr.setSelection({ kind: 'gap', id: image.id, side: 'end' }));
    view.press('Unidentified');
    view.type('x');

    expect(view.modelTexts).toEqual(['ab', '', 'x']);
  });

  it('jumps past a picture that ends or starts the document with Ctrl+End and Ctrl+Home', () => {
    const first = node('image', [], { src: 'a.png' });
    const last = node('image', [], { src: 'b.png' });
    const view = mounted(doc(first, node('paragraph', ['ab']), last));

    view.focus();
    view.place(2);

    expect(view.press('End', { ctrl: true })).toBe(true);
    expect(view.selection).toEqual({ kind: 'gap', id: last.id, side: 'end' });

    view.type('x');

    expect(view.modelTexts).toEqual(['', 'ab', '', 'x']);
    expect(view.press('Home', { ctrl: true })).toBe(true);
    expect(view.selection).toEqual({ kind: 'gap', id: first.id, side: 'start' });
  });

  it('leaves Ctrl+End to the browser when the document ends with text', () => {
    const view = mounted(twoParagraphs());

    view.focus();
    view.place(1);

    expect(view.press('End', { ctrl: true })).toBe(false);
  });

  it('selects the whole table when a click lands on one of its cells', () => {
    const cell = node('table_cell', [], { column: 'a', value: 1 });

    const table = node('table', [
      node('table_head', [node('table_column', [], { key: 'a', name: 'A' })]),
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

    expect(view.copy('copy', 'text/html')).toMatch(
      /^<div data-numior-editor="[\da-f]{32}"><p><strong>y<\/strong>b<\/p><p>c<\/p><\/div>$/u,
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

  it('pastes a mention copied here as a mention and a mention from other markup as its text', () => {
    const view = mounted(
      doc(node('paragraph', ['hi ', node('mention', [], { user: 'u1', label: 'Ann' })])),
    );

    view.focus();
    view.selectAll();

    const copied = view.copy('copy', 'text/html') ?? '';

    view.place(1);
    view.paste('', copied);
    expect(view.mentions).toEqual(['u1', 'u1']);

    view.place(1);
    view.paste('', '<p><span data-user="boss">@Boss</span></p>');
    view.paste('', '<div data-numior-editor="1"><p><span data-user="boss">@Chief</span></p></div>');

    expect(view.mentions).toEqual(['u1', 'u1']);
    expect(view.modelTexts).toEqual(['@Boss@Chiefhi \ufffchi \ufffc']);
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

  it.each([
    ['Home', {}, 1],
    ['PageUp', {}, 1],
    ['ArrowLeft', {}, 1],
    ['ArrowUp', {}, 1],
    ['Home', { ctrl: true }, 1],
    ['Home', { meta: true }, 1],
    ['ArrowLeft', { ctrl: true }, 1],
    ['ArrowLeft', { meta: true }, 1],
    ['ArrowUp', { meta: true }, 1],
    ['End', {}, 7],
    ['PageDown', {}, 7],
    ['ArrowRight', {}, 7],
    ['ArrowDown', {}, 7],
    ['End', { ctrl: true }, 7],
    ['End', { meta: true }, 7],
    ['ArrowRight', { ctrl: true }, 7],
    ['ArrowRight', { meta: true }, 7],
    ['ArrowDown', { meta: true }, 7],
  ] as const)(
    'leaves a whole-document selection with %s %o for the caret at %i',
    (key, options, caret) => {
      const view = mounted(twoParagraphs());

      view.focus();
      view.selectAll();

      expect(view.press(key, options)).toBe(true);
      expect(view.selection).toEqual(textSelection(caret));
      expect(view.selectsAll).toBe(false);
    },
  );

  it('leaves a whole-document selection with Alt and an arrow and lets the browser act on the key', () => {
    const view = mounted(twoParagraphs());

    view.focus();
    view.selectAll();

    expect(view.press('ArrowLeft', { alt: true })).toBe(false);
    expect(view.selection).toEqual(textSelection(1));

    view.selectAll();

    expect(view.press('ArrowRight', { alt: true })).toBe(false);
    expect(view.selection).toEqual(textSelection(7));
  });

  it.each([
    ['ArrowRight', {}],
    ['ArrowDown', {}],
    ['End', {}],
    ['PageDown', {}],
    ['End', { ctrl: true }],
    ['ArrowRight', { ctrl: true }],
  ] as const)('keeps a whole-document selection as it is on Shift with %s %o', (key, options) => {
    const view = mounted(twoParagraphs());

    view.focus();
    view.selectAll();

    expect(view.press(key, { ...options, shift: true })).toBe(true);
    expect(view.selection).toEqual({ kind: 'all' });
    expect(view.selectsAll).toBe(true);
  });

  it.each([
    ['ArrowLeft', {}],
    ['ArrowUp', {}],
    ['Home', {}],
    ['PageUp', {}],
    ['Home', { ctrl: true }],
    ['ArrowLeft', { ctrl: true }],
  ] as const)(
    'spans a whole-document selection from the start to the end for the browser to move its end on Shift with %s %o',
    (key, options) => {
      const view = mounted(twoParagraphs());

      view.focus();
      view.selectAll();

      expect(view.press(key, { ...options, shift: true })).toBe(false);
      expect(view.selection).toEqual(textSelection(1, 7));
      expect(view.domSpan).toEqual({ anchor: 1, head: 7 });
      expect(view.selectsAll).toBe(false);
    },
  );

  it('leaves a whole-document selection on a plain press of the main button only', () => {
    const view = mounted(twoParagraphs());

    view.focus();
    view.selectAll();
    view.pressBlock(0, { button: 2 });

    expect(view.selectsAll).toBe(true);

    view.pressBlock(0, { shift: true });

    expect(view.selectsAll).toBe(true);

    view.pressBlock(0);
    view.releaseMouse();

    expect(view.selection).toEqual(textSelection(1));
    expect(view.selectsAll).toBe(false);
  });

  it('keeps the text as drawn while the browser handles a press and leaves a whole-document selection at the pressed point on release', () => {
    const view = mounted(twoParagraphs());

    view.focus();
    view.selectAll();
    view.caretFrom('position', 'cd', 1);
    view.pressBlock(1);

    expect(view.selectsAll).toBe(true);

    view.releaseMouse();

    expect(view.selection).toEqual(textSelection(view.positionInText('cd', 1)));
  });

  it('takes the caret the browser placed for a press during a whole-document selection', () => {
    const view = mounted(twoParagraphs());

    view.selectAll();
    view.focusOutside();
    view.pressBlock(1);
    view.pointInDom(view.positionInText('cd', 2));
    view.releaseMouse();

    expect(view.selection).toEqual(textSelection(view.positionInText('cd', 2)));
  });
});
