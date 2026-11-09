import { CommentEventKind } from '@numior/collaboration';
import type { CommentEvent, CommentThread, CommentsAdapter } from '@numior/collaboration';
import { promiseTimeout, useBroadcastChannel } from '@vueuse/core';
import { watch } from 'vue';

type Listener = (event: CommentEvent) => void;

type Notice =
  | { readonly kind: typeof NoticeKind.Ask; readonly doc: string }
  | {
      readonly kind: typeof NoticeKind.All;
      readonly doc: string;
      readonly threads: readonly CommentThread[];
    }
  | { readonly kind: typeof NoticeKind.Event; readonly doc: string; readonly event: CommentEvent };

const NoticeKind = { Ask: 'ask', All: 'all', Event: 'event' } as const;

const CHANNEL = 'nui-collab-comments';

const ANSWER_WAIT = 150;

const newId = (): string => Math.random().toString(36).slice(2, 10);

const now = (): string => new Date().toISOString();

const merged = (
  own: readonly CommentThread[],
  theirs: readonly CommentThread[],
): readonly CommentThread[] => {
  const known = new Set(own.map((thread) => thread.id));

  return [...own, ...theirs.filter((thread) => !known.has(thread.id))];
};

export const fakeComments = (): CommentsAdapter => {
  const { data, post } = useBroadcastChannel<Notice, Notice>({ name: CHANNEL });
  const rooms = new Map<string, readonly CommentThread[]>();
  const listeners = new Map<string, Set<Listener>>();

  const threadsOf = (doc: string): readonly CommentThread[] => rooms.get(doc) ?? [];

  const kept = (doc: string, thread: CommentThread): void => {
    const threads = threadsOf(doc);

    rooms.set(
      doc,
      threads.some((item) => item.id === thread.id)
        ? threads.map((item) => (item.id === thread.id ? thread : item))
        : [...threads, thread],
    );
  };

  const dropped = (doc: string, id: string): void => {
    rooms.set(
      doc,
      threadsOf(doc).filter((item) => item.id !== id),
    );
  };

  const taken = (doc: string, event: CommentEvent): void => {
    switch (event.kind) {
      case CommentEventKind.Changed:
        kept(doc, event.thread);
        break;
      case CommentEventKind.Removed:
        dropped(doc, event.id);
        break;
    }
  };

  const told = (doc: string, event: CommentEvent): void => {
    taken(doc, event);
    post({ kind: NoticeKind.Event, doc, event });
  };

  const updated = (
    doc: string,
    id: string,
    change: (thread: CommentThread) => CommentThread,
  ): CommentThread => {
    const thread = threadsOf(doc).find((item) => item.id === id);

    if (thread === undefined) {
      throw new Error('The thread is gone');
    }

    const next = change(thread);

    told(doc, { kind: CommentEventKind.Changed, thread: next });
    return next;
  };

  const answered = (doc: string): void => {
    if (rooms.has(doc)) {
      post({ kind: NoticeKind.All, doc, threads: threadsOf(doc) });
    }
  };

  const announced = (doc: string, event: CommentEvent): void => {
    taken(doc, event);

    listeners.get(doc)?.forEach((listener) => {
      listener(event);
    });
  };

  const heard = (notice: Notice): void => {
    switch (notice.kind) {
      case NoticeKind.Ask:
        answered(notice.doc);
        break;
      case NoticeKind.All:
        rooms.set(notice.doc, merged(threadsOf(notice.doc), notice.threads));
        break;
      case NoticeKind.Event:
        announced(notice.doc, notice.event);
        break;
    }
  };

  watch(data, heard, { flush: 'sync' });

  return {
    list: async (doc) => {
      post({ kind: NoticeKind.Ask, doc });
      await promiseTimeout(ANSWER_WAIT);
      rooms.set(doc, threadsOf(doc));
      return threadsOf(doc);
    },
    create: (doc, comment) => {
      const thread = { ...comment, id: newId(), createdAt: now(), resolved: false, replies: [] };

      told(doc, { kind: CommentEventKind.Changed, thread });
      return Promise.resolve(thread);
    },
    reply: (doc, id, reply) =>
      Promise.resolve(
        updated(doc, id, (thread) => ({
          ...thread,
          replies: [...thread.replies, { ...reply, id: newId(), createdAt: now() }],
        })),
      ),
    resolve: (doc, id, resolved) =>
      Promise.resolve(updated(doc, id, (thread) => ({ ...thread, resolved }))),
    remove: (doc, id) => {
      told(doc, { kind: CommentEventKind.Removed, id });
      return Promise.resolve();
    },
    move: (doc, id, anchor) => {
      updated(doc, id, (thread) => ({ ...thread, anchor }));
      return Promise.resolve();
    },
    subscribe: (doc, listener) => {
      const group = listeners.get(doc) ?? new Set<Listener>();

      listeners.set(doc, group.add(listener));
      return () => {
        group.delete(listener);
      };
    },
  };
};
