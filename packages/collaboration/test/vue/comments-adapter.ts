import { createDoc, toJSON, type DocJSON } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import {
  CommentEventKind,
  type CommentAnchor,
  type CommentEvent,
  type CommentThread,
  type CommentsAdapter,
} from '../../src';

export interface FakeCommentsAdapter extends CommentsAdapter {
  readonly moved: readonly (readonly [string, CommentAnchor])[];
  readonly created: () => number;
  readonly stored: () => readonly CommentThread[];
  readonly holdList: () => void;
  readonly releaseList: () => void;
  readonly failNext: () => void;
  readonly emit: (event: CommentEvent) => void;
}

export const documentOf = (...texts: readonly string[]): DocJSON =>
  toJSON(
    createDoc(
      fixtureSchema,
      fixtureSchema.element(fixtureSchema.top.name, {
        id: 'root',
        content: texts.map((text, index) =>
          fixtureSchema.element('paragraph', {
            id: `p${index.toString()}`,
            content: [fixtureSchema.text(text)],
          }),
        ),
      }),
    ),
  );

const TIME = '2026-11-09T10:00:00.000Z';

export const firstLine: CommentAnchor = {
  kind: 'text',
  fromId: 'p0',
  fromOffset: 0,
  toId: 'p0',
  toOffset: 3,
};

export const threadOf = (id: string, overrides: Partial<CommentThread> = {}): CommentThread => ({
  id,
  anchor: firstLine,
  author: { id: 'ann', name: 'Ann' },
  body: `Body of ${id}`,
  createdAt: TIME,
  resolved: false,
  replies: [],
  ...overrides,
});

export const fakeCommentsAdapter = (seed: readonly CommentThread[] = []): FakeCommentsAdapter => {
  let threads = [...seed];
  let serial = 0;
  let failing = false;
  let held: Promise<void> | undefined;
  let release: (() => void) | undefined;
  let listener: ((event: CommentEvent) => void) | undefined;
  const moved: (readonly [string, CommentAnchor])[] = [];

  const guarded = <T>(value: () => T): Promise<T> => {
    if (failing) {
      failing = false;
      return Promise.reject(new Error('refused'));
    }
    return Promise.resolve(value());
  };

  const updated = (id: string, change: (thread: CommentThread) => CommentThread): CommentThread => {
    const known = threads.find((thread) => thread.id === id) ?? threadOf(id);
    const next = change(known);

    threads = threads.map((thread) => (thread.id === id ? next : thread));
    return next;
  };

  return {
    moved,
    created: () => serial,
    stored: () => threads,
    holdList: () => {
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    releaseList: () => {
      release?.();
    },
    failNext: () => {
      failing = true;
    },
    emit: (event) => {
      listener?.(event);
    },
    list: async () => {
      const listed = threads;

      await held;
      return guarded(() => listed);
    },
    create: (_doc, comment) =>
      guarded(() => {
        serial += 1;

        const thread = { ...threadOf(`new-${serial}`), ...comment };

        threads = [...threads, thread];
        return thread;
      }),
    reply: (_doc, id, reply) =>
      guarded(() =>
        updated(id, (thread) => ({
          ...thread,
          replies: [...thread.replies, { id: `${id}-r`, createdAt: TIME, ...reply }],
        })),
      ),
    resolve: (_doc, id, resolved) =>
      guarded(() => updated(id, (thread) => ({ ...thread, resolved }))),
    remove: (_doc, id) =>
      guarded(() => {
        threads = threads.filter((thread) => thread.id !== id);
      }),
    move: (_doc, id, anchor) =>
      guarded(() => {
        moved.push([id, anchor]);
      }),
    subscribe: (_doc, next) => {
      listener = next;
      return () => {
        listener = undefined;
      };
    },
  };
};

export { CommentEventKind };
