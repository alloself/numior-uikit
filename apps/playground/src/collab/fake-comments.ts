import type { CommentThread, CommentsAdapter } from '@numior/collaboration';

const newId = (): string => Math.random().toString(36).slice(2, 10);

const now = (): string => new Date().toISOString();

export const fakeComments = (): CommentsAdapter => {
  let threads: readonly CommentThread[] = [];

  const updated = (id: string, change: (thread: CommentThread) => CommentThread): CommentThread => {
    const thread = threads.find((item) => item.id === id);

    if (thread === undefined) {
      throw new Error('The thread is gone');
    }

    const next = change(thread);

    threads = threads.map((item) => (item.id === id ? next : item));
    return next;
  };

  return {
    list: () => Promise.resolve(threads),
    create: (_doc, comment) => {
      const thread = { ...comment, id: newId(), createdAt: now(), resolved: false, replies: [] };

      threads = [...threads, thread];
      return Promise.resolve(thread);
    },
    reply: (_doc, id, reply) =>
      Promise.resolve(
        updated(id, (thread) => ({
          ...thread,
          replies: [...thread.replies, { ...reply, id: newId(), createdAt: now() }],
        })),
      ),
    resolve: (_doc, id, resolved) =>
      Promise.resolve(updated(id, (thread) => ({ ...thread, resolved }))),
    remove: (_doc, id) => {
      threads = threads.filter((item) => item.id !== id);
      return Promise.resolve();
    },
    move: (_doc, id, anchor) => {
      updated(id, (thread) => ({ ...thread, anchor }));
      return Promise.resolve();
    },
  };
};
