import type { CommentThread, CommentsAdapter } from '@numior/collaboration';

const newId = (): string => Math.random().toString(36).slice(2, 10);

const now = (): string => new Date().toISOString();

export const memoryComments = (initial: readonly CommentThread[]): CommentsAdapter => {
  let threads = initial;

  const changed = (
    id: string,
    change: (thread: CommentThread) => CommentThread,
  ): Promise<CommentThread> => {
    const thread = threads.find((item) => item.id === id);

    if (thread === undefined) {
      return Promise.reject(new Error('The thread is gone'));
    }

    const next = change(thread);

    threads = threads.map((item) => (item.id === id ? next : item));
    return Promise.resolve(next);
  };

  return {
    list: () => Promise.resolve(threads),
    create: (_doc, comment) => {
      const thread = { ...comment, id: newId(), createdAt: now(), resolved: false, replies: [] };

      threads = [...threads, thread];
      return Promise.resolve(thread);
    },
    reply: (_doc, id, reply) =>
      changed(id, (thread) => ({
        ...thread,
        replies: [...thread.replies, { ...reply, id: newId(), createdAt: now() }],
      })),
    resolve: (_doc, id, resolved) => changed(id, (thread) => ({ ...thread, resolved })),
    remove: (_doc, id) => {
      threads = threads.filter((item) => item.id !== id);
      return Promise.resolve();
    },
    move: async (_doc, id, anchor) => {
      await changed(id, (thread) => ({ ...thread, anchor }));
    },
  };
};
