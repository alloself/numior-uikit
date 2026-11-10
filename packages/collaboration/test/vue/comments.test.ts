import { enableAutoUnmount, renderToString } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  CommentEventKind,
  documentOf,
  fakeCommentsAdapter,
  firstLine,
  threadOf,
} from './comments-adapter';
import { ANN, CommentsDriver } from './comments-driver';
import CommentsHost from './CommentsHost.vue';

const secondLine = { kind: 'text', fromId: 'p1', fromOffset: 0, toId: 'p1', toOffset: 3 } as const;

enableAutoUnmount(afterEach);

afterEach(() => {
  vi.useRealTimers();
});

describe('NuiEditorComments', () => {
  it('shows the stored threads in document order and marks their text', async () => {
    const view = CommentsDriver.mount([
      threadOf('later', { anchor: secondLine }),
      threadOf('first', { anchor: firstLine }),
    ]);

    await view.loaded();

    expect(view.bodies).toEqual(['Body of first', 'Body of later']);
    expect(view.highlights).toEqual(['one', 'two']);
  });

  it('says that there are no comments yet', async () => {
    const view = CommentsDriver.mount();

    await view.loaded();

    expect(view.emptyShown).toBe(true);
  });

  it('offers to comment only on selected text', async () => {
    const view = CommentsDriver.mount();

    await view.loaded();

    expect(view.addDisabled).toBe(true);

    await view.select(1, 4);

    expect(view.addDisabled).toBe(false);
  });

  it('adds a comment to the selected text', async () => {
    const view = CommentsDriver.mount();

    await view.loaded();

    await view.select(1, 4);
    await view.press('Add comment');
    await view.write('Please check');
    await view.submit();

    expect(view.bodies).toEqual(['Please check']);
    expect(view.highlights).toEqual(['one']);
    expect(view.activeHighlights).toEqual(['one']);
  });

  it('throws the draft away on cancel', async () => {
    const view = CommentsDriver.mount();

    await view.loaded();

    await view.select(1, 4);
    await view.press('Add comment');
    await view.press('Cancel');

    expect(view.highlights).toEqual([]);
    expect(view.adapter.created()).toBe(0);
  });

  it('keeps the draft and reports a refused comment', async () => {
    const view = CommentsDriver.mount();

    await view.loaded();

    await view.select(1, 4);
    await view.press('Add comment');
    await view.write('Refused');
    view.adapter.failNext();
    await view.submit();

    expect(view.failed).toBe(true);
    expect(view.bodies).toEqual([]);
    expect(view.highlights).toEqual(['one']);
  });

  it('adds a reply to a thread', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    await view.pressIn(0, 'Reply');
    await view.write('Agreed');
    await view.submit();

    expect(view.replies).toEqual(['Agreed']);
  });

  it('resolves a thread and opens it again', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    await view.pressIn(0, 'Resolve');

    expect(view.badges(0)).toEqual(['Resolved']);
    expect(view.highlights).toEqual([]);

    await view.pressIn(0, 'Reopen');

    expect(view.badges(0)).toEqual([]);
    expect(view.highlights).toEqual(['one']);
  });

  it('lets only the author delete a thread', async () => {
    const view = CommentsDriver.mount([
      threadOf('mine', { anchor: firstLine }),
      threadOf('theirs', { anchor: secondLine, author: { id: 'bob', name: 'Bob' } }),
    ]);

    await view.loaded();

    expect(view.hasButton(1, 'Delete')).toBe(false);

    await view.pressIn(0, 'Delete');

    expect(view.bodies).toEqual(['Body of theirs']);
    expect(view.highlights).toEqual(['two']);
  });

  it('activates a thread from its text and from the panel', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    await view.select(2, 2);

    expect(view.isActive(0)).toBe(true);

    await view.select(7, 7);

    expect(view.isActive(0)).toBe(false);

    await view.clickThreadBody(0);

    expect(view.activeHighlights).toEqual(['one']);
  });

  it('leaves the popover shut while the caret walks through commented text', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    await view.select(2, 2);

    expect(view.popoverOpen).toBe(false);
  });

  it('opens the thread when its text is pressed without moving', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    await view.pressMark(0);

    expect(view.popoverThread).toBe('Body of t');
  });

  it('leaves the popover shut when the press drags across the text', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    await view.pressMark(30);

    expect(view.popoverOpen).toBe(false);
  });

  it('opens the thread at its text from the list', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    await view.clickThreadBody(0);

    expect(view.popoverThread).toBe('Body of t');
  });

  it('shows a new comment in the popover at its text', async () => {
    const view = CommentsDriver.mount();

    await view.loaded();

    await view.select(1, 4);
    await view.press('Add comment');
    await view.write('Please check');
    await view.submit();

    expect(view.popoverThread).toBe('Please check');
  });

  it('flags a thread whose text is gone', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    await view.remove(1, 4);

    expect(view.badges(0)).toEqual(['The text was removed']);
    expect(view.hasButton(0, 'Show in text')).toBe(false);
  });

  it('flags a thread whose anchor no longer resolves', async () => {
    const view = CommentsDriver.mount([
      threadOf('t', {
        anchor: { kind: 'text', fromId: 'gone', fromOffset: 0, toId: 'gone', toOffset: 3 },
      }),
    ]);

    await view.loaded();

    expect(view.badges(0)).toEqual(['The text was removed']);
  });

  it('writes moved anchors back after a pause', async () => {
    const view = CommentsDriver.mount([threadOf('t', { anchor: secondLine })]);

    await view.loaded();

    vi.useFakeTimers();
    await view.insert('xx', 7);

    expect(view.adapter.moved).toEqual([]);

    await vi.advanceTimersByTimeAsync(1000);

    expect(view.adapter.moved).toEqual([
      ['t', { kind: 'text', fromId: 'p1', fromOffset: 0, toId: 'p1', toOffset: 5 }],
    ]);
  });

  it('puts a comment made on an older version where its text is now', async () => {
    const view = CommentsDriver.mountShared();

    await view.loaded();
    await view.typedByOther('xx', 1);

    view.adapter.emit({
      kind: CommentEventKind.Changed,
      thread: threadOf('t', { anchor: { ...firstLine, at: { version: 0, from: 1, to: 4 } } }),
    });

    await vi.waitFor(() => {
      expect(view.highlights).toEqual(['one']);
    });
  });

  it('waits with a comment made on a version it has not reached', async () => {
    const view = CommentsDriver.mountShared();

    await view.loaded();

    view.adapter.emit({
      kind: CommentEventKind.Changed,
      thread: threadOf('t', { anchor: { ...secondLine, at: { version: 1, from: 8, to: 11 } } }),
    });

    await vi.waitFor(() => {
      expect(view.bodies).toEqual(['Body of t']);
    });

    expect(view.highlights).toEqual([]);

    await view.typedByOther('xx', 1);

    await vi.waitFor(() => {
      expect(view.highlights).toEqual(['two']);
    });
  });

  it('writes an anchor its own edit moved once the edit is confirmed, with the version it holds on', async () => {
    const view = CommentsDriver.mountShared([threadOf('t')]);

    await view.loaded();

    vi.useFakeTimers();
    await view.insert('xx', 1);
    await vi.advanceTimersByTimeAsync(1000);

    expect(view.adapter.moved).toEqual([]);

    await view.confirm();
    await vi.advanceTimersByTimeAsync(1000);

    expect(view.adapter.moved).toEqual([
      [
        't',
        {
          kind: 'text',
          fromId: 'p0',
          fromOffset: 2,
          toId: 'p0',
          toOffset: 5,
          at: { version: 1, from: 3, to: 6 },
        },
      ],
    ]);
  });

  it('leaves an anchor moved by someone else to the one who moved it', async () => {
    const view = CommentsDriver.mountShared([threadOf('t')]);

    await view.loaded();

    vi.useFakeTimers();
    await view.typedByOther('xx', 1);
    await vi.advanceTimersByTimeAsync(1000);

    expect(view.highlights).toEqual(['one']);
    expect(view.adapter.moved).toEqual([]);
  });

  it('states a new comment with the version it was made on', async () => {
    const view = CommentsDriver.mountShared();

    await view.loaded();

    await view.select(1, 4);
    await view.press('Add comment');
    await view.write('Please check');
    await view.submit();

    expect(view.adapter.stored().map((thread) => thread.anchor)).toEqual([
      { ...firstLine, at: { version: 0, from: 1, to: 4 } },
    ]);
  });

  it('states a new comment without a version while its own edits wait, and adds it once they are confirmed', async () => {
    const view = CommentsDriver.mountShared();

    await view.loaded();

    vi.useFakeTimers();
    await view.insert('x', 7);
    await view.select(1, 4);
    await view.press('Add comment');
    await view.write('Please check');
    await view.submit();

    expect(view.adapter.stored().map((thread) => thread.anchor)).toEqual([firstLine]);

    await view.confirm();
    await vi.advanceTimersByTimeAsync(1000);

    expect(view.adapter.moved).toEqual([
      ['new-1', { ...firstLine, at: { version: 1, from: 1, to: 4 } }],
    ]);
  });

  it('applies changes pushed by the adapter', async () => {
    const view = CommentsDriver.mount([threadOf('t')]);

    await view.loaded();

    view.adapter.emit({
      kind: CommentEventKind.Changed,
      thread: threadOf('pushed', { anchor: secondLine }),
    });

    await vi.waitFor(() => {
      expect(view.highlights).toEqual(['one', 'two']);
    });

    view.adapter.emit({ kind: CommentEventKind.Removed, id: 't' });

    await vi.waitFor(() => {
      expect(view.bodies).toEqual(['Body of pushed']);
    });
  });

  it('prefers texts passed through labels', async () => {
    const view = CommentsDriver.mount([], { comments: 'Notes' });

    await view.loaded();

    expect(view.title).toBe('Notes');
  });

  it('renders on the server', async () => {
    const html = await renderToString(CommentsHost, {
      props: {
        initial: documentOf('one'),
        adapter: fakeCommentsAdapter(),
        user: ANN,
      },
    });

    expect(html).toContain('nui-collab-comments');
  });
});
