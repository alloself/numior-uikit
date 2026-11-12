import {
  activateAnchor,
  activeAnchor,
  anchorFromJSON,
  anchorToJSON,
  anchorsAt,
  anchorsOf,
  AnchorRangeKind,
  definePlugin,
  removeAnchor,
  setAnchor,
  type Anchor,
  type AnchorRange,
  type Command,
  type Doc,
  type EditorState,
} from '@numior/editor-core';
import type { NuiEditorSelectionAction } from '@numior/editor-vue';
import { useMessages } from '@numior/primitives';
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import {
  CommentEventKind,
  type CommentAnchor,
  type CommentEvent,
  type CommentThread,
} from '../comments/comments.types';
import { collabProgress, positionsSince } from '../editor/collab';
import { collabMessages } from './collab.messages';
import type {
  CollabComments,
  CommentSpot,
  CommentThreadView,
  UseEditorCommentsOptions,
} from './collab.types';

const DRAFT = '__nui-comment-draft';

const MOVE_DELAY = 1000;

const NO_THREADS: readonly CommentThread[] = [];

const NO_LAYOUT: readonly Anchor[] = [];

const startOf = (doc: Doc, range: AnchorRange): number =>
  range.kind === AnchorRangeKind.Text ? range.from : (doc.positionOf(range.id) ?? 0);

const blockOf = (doc: Doc, range: AnchorRange): string =>
  range.kind === AnchorRangeKind.Text ? doc.resolve(range.from).parent.id : range.id;

const layoutOf = (doc: Doc, anchors: ReadonlyMap<string, Anchor>): readonly Anchor[] =>
  [...anchors.values()].toSorted((a, b) => startOf(doc, a.range) - startOf(doc, b.range));

const layoutKey = (layout: readonly Anchor[]): string =>
  layout.map((anchor) => `${anchor.id}:${anchor.lost ? 1 : 0}`).join();

const sameSpot = (left: CommentAnchor, right: CommentAnchor): boolean =>
  JSON.stringify({ ...left, at: undefined }) === JSON.stringify({ ...right, at: undefined });

const isAhead = (state: EditorState, anchor: CommentAnchor): boolean =>
  anchor.at !== undefined && anchor.at.version > (collabProgress(state)?.version ?? Infinity);

const isTraced = (state: EditorState, anchor: CommentAnchor): boolean =>
  anchor.kind === AnchorRangeKind.Text &&
  anchor.at !== undefined &&
  positionsSince(state, anchor.at.version) !== undefined;

const carried = (state: EditorState, anchor: CommentAnchor): AnchorRange | undefined => {
  const mapping = anchor.at === undefined ? undefined : positionsSince(state, anchor.at.version);

  if (anchor.at === undefined || mapping === undefined) {
    return undefined;
  }

  const from = mapping.map(anchor.at.from, 1);
  const to = mapping.map(anchor.at.to, -1);

  return from < to && to <= state.doc.size ? { kind: AnchorRangeKind.Text, from, to } : undefined;
};

const rangeIn = (state: EditorState, anchor: CommentAnchor): AnchorRange | undefined =>
  isTraced(state, anchor) ? carried(state, anchor) : anchorFromJSON(state.doc, anchor);

const statedAt = (state: EditorState, range: AnchorRange): CommentAnchor => {
  const json = anchorToJSON(state.doc, range);
  const progress = collabProgress(state);

  return progress?.pending === 0 && range.kind === AnchorRangeKind.Text
    ? { ...json, at: { version: progress.version, from: range.from, to: range.to } }
    : json;
};

const movedByOwnEdit = (state: EditorState, before: EditorState): readonly string[] => {
  if (collabProgress(state)?.version !== collabProgress(before)?.version) {
    return [];
  }

  const known = anchorsOf(before);

  return [...anchorsOf(state).values()].reduce<string[]>((found, anchor) => {
    const was = known.get(anchor.id);

    if (
      !anchor.lost &&
      was !== undefined &&
      !sameSpot(anchorToJSON(state.doc, anchor.range), anchorToJSON(before.doc, was.range))
    ) {
      found.push(anchor.id);
    }
    return found;
  }, []);
};

const backByOwnEdit = (state: EditorState, before: EditorState): readonly string[] => {
  if (collabProgress(state)?.version !== collabProgress(before)?.version) {
    return [];
  }

  const known = anchorsOf(before);

  return [...anchorsOf(state).values()].reduce<string[]>((found, anchor) => {
    if (!anchor.lost && known.get(anchor.id)?.lost === true) {
      found.push(anchor.id);
    }
    return found;
  }, []);
};

export const useEditorComments = (options: UseEditorCommentsOptions): CollabComments => {
  const { doc, user, adapter, editor } = options;
  const threads = shallowRef<readonly CommentThread[]>(NO_THREADS);
  const layout = shallowRef<readonly Anchor[]>(NO_LAYOUT);
  const active = shallowRef<string>();
  const opened = shallowRef<string>();
  const placed = ref(false);
  const drafting = ref(false);
  const failed = ref(false);
  const revision = ref(0);
  const messages = useMessages(collabMessages);
  const aborter = new AbortController();
  const owed = new Set<string>();
  const back = new Set<string>();
  const waiting = new Map<string, CommentThread>();
  const early: CommentEvent[] = [];

  let latest: EditorState | undefined;
  let currentKey = '';
  let loading = true;
  let unsubscribe: (() => void) | undefined;

  const run = (command: Command): boolean => editor()?.run(command) ?? false;

  const read = (state: EditorState): void => {
    latest = state;

    const next = layoutOf(state.doc, anchorsOf(state));
    const key = layoutKey(next);

    if (key !== currentKey) {
      currentKey = key;
      layout.value = next;
    }
    active.value = activeAnchor(state);
  };

  const place = (thread: CommentThread): void => {
    const state = latest;

    waiting.delete(thread.id);

    if (state === undefined || thread.resolved) {
      return;
    }
    if (isAhead(state, thread.anchor)) {
      waiting.set(thread.id, thread);
      return;
    }

    const range = rangeIn(state, thread.anchor);
    const held = anchorsOf(state).get(thread.id);

    const trusted =
      held === undefined ||
      held.lost ||
      collabProgress(state) === undefined ||
      isTraced(state, thread.anchor);

    if (range === undefined || !trusted) {
      return;
    }

    run(setAnchor(thread.id, range));
  };

  const placeWaiting = (): void => {
    waiting.forEach((thread) => {
      if (latest === undefined || isAhead(latest, thread.anchor)) {
        return;
      }

      place(thread);
    });
  };

  const replaced = (thread: CommentThread): void => {
    const known = threads.value.some((item) => item.id === thread.id);

    if (thread.resolved && opened.value === thread.id) {
      opened.value = undefined;
    }

    threads.value = known
      ? threads.value.map((item) => (item.id === thread.id ? thread : item))
      : [...threads.value, thread];
  };

  const dropped = (id: string): void => {
    threads.value = threads.value.filter((item) => item.id !== id);

    if (opened.value === id) {
      opened.value = undefined;
    }
    owed.delete(id);
    waiting.delete(id);
    run(removeAnchor(id));
  };

  const attempt = async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    failed.value = false;

    try {
      return await action();
    } catch {
      failed.value = true;
      return undefined;
    }
  };

  const writeMoves = (): void => {
    const state = latest;

    if (state === undefined || adapter.move === undefined || aborter.signal.aborted) {
      return;
    }
    if ((collabProgress(state)?.pending ?? 0) > 0) {
      return;
    }

    const anchors = anchorsOf(state);

    threads.value.forEach((thread) => {
      const anchor = anchors.get(thread.id);

      if (!owed.has(thread.id) || anchor === undefined || anchor.lost) {
        return;
      }

      const json = statedAt(state, anchor.range);

      const known =
        sameSpot(json, thread.anchor) && (json.at === undefined || thread.anchor.at !== undefined);

      if (known && !back.has(thread.id)) {
        return;
      }

      replaced({ ...thread, anchor: json });
      void attempt(async () => adapter.move?.(doc, thread.id, json));
    });

    owed.clear();
    back.clear();
  };

  const scheduleMoves = useDebounceFn(writeMoves, MOVE_DELAY);

  const plugin = definePlugin({
    name: 'editorComments',
    props: {
      stateChanged: (state, before) => {
        read(state);

        if (state.doc !== before.doc) {
          revision.value += 1;
          movedByOwnEdit(state, before).forEach((id) => owed.add(id));
          backByOwnEdit(state, before).forEach((id) => back.add(id));
        }
        if (owed.size > 0) {
          void scheduleMoves();
        }
        if (
          waiting.size === 0 ||
          collabProgress(state)?.version === collabProgress(before)?.version
        ) {
          return;
        }

        void nextTick(placeWaiting);
      },
    },
  });

  const placeAll = (): void => {
    if (latest === undefined) {
      return;
    }

    threads.value.forEach(place);
    placed.value = true;
  };

  const onEvent = (event: CommentEvent): void => {
    if (loading) {
      early.push(event);
    }

    switch (event.kind) {
      case CommentEventKind.Changed:
        replaced(event.thread);
        place(event.thread);
        break;
      case CommentEventKind.Removed:
        dropped(event.id);
        break;
    }
  };

  const startDraft: Command = (state, dispatch) => {
    const able = setAnchor(DRAFT)(state, dispatch);

    if (able && dispatch !== undefined) {
      drafting.value = true;
    }
    return able;
  };

  const action = computed<NuiEditorSelectionAction>(() => ({
    key: 'comment',
    label: messages.value.add,
    icon: 'comment',
    command: startDraft,
  }));

  const cancel = (): void => {
    run(removeAnchor(DRAFT));
    drafting.value = false;
  };

  const submit = async (body: string): Promise<boolean> => {
    const state = latest;
    const draft = state === undefined ? undefined : anchorsOf(state).get(DRAFT);

    if (state === undefined || draft === undefined) {
      return false;
    }

    const anchor = statedAt(state, draft.range);
    const thread = await attempt(() => adapter.create(doc, { anchor, author: user, body }));

    if (thread === undefined) {
      return false;
    }
    replaced(thread);

    if (anchor.at === undefined && collabProgress(state) !== undefined) {
      owed.add(thread.id);
    }

    const current = latest === undefined ? undefined : anchorsOf(latest).get(DRAFT);

    if (current !== undefined && !current.lost) {
      run(setAnchor(thread.id, current.range));
      run(activateAnchor(thread.id));
      opened.value = thread.id;
    }
    cancel();
    return true;
  };

  const reply = async (id: string, body: string): Promise<boolean> => {
    const thread = await attempt(() => adapter.reply(doc, id, { author: user, body }));

    if (thread !== undefined) {
      replaced(thread);
    }
    return thread !== undefined;
  };

  const resolve = async (id: string, resolved: boolean): Promise<void> => {
    const thread = await attempt(() => adapter.resolve(doc, id, resolved));

    if (thread === undefined) {
      return;
    }
    replaced(thread);

    if (resolved) {
      run(removeAnchor(id));
    } else {
      place(thread);
    }
  };

  const remove = async (id: string): Promise<void> => {
    let done = false;

    await attempt(async () => {
      await adapter.remove(doc, id);
      done = true;
    });

    if (!done) {
      return;
    }

    dropped(id);
  };

  const close = (): void => {
    if (drafting.value) {
      cancel();
    } else {
      opened.value = undefined;

      if (active.value !== undefined) {
        run(activateAnchor(undefined));
      }
    }
  };

  const openAt = (pos: number): void => {
    const id = latest === undefined ? undefined : anchorsAt(latest, pos).at(-1);

    if (id === undefined || id === DRAFT) {
      return;
    }

    opened.value = id;
  };

  const spot = (): CommentSpot | undefined => {
    const id = drafting.value ? DRAFT : opened.value;
    const anchor = latest === undefined || id === undefined ? undefined : anchorsOf(latest).get(id);

    if (latest === undefined || anchor === undefined || anchor.lost) {
      return undefined;
    }
    if (anchor.range.kind === AnchorRangeKind.Text) {
      return { from: anchor.range.from, to: anchor.range.to };
    }

    const from = latest.doc.positionOf(anchor.range.id);

    return from === undefined ? undefined : { from, to: from };
  };

  const activate = (id: string): void => {
    const anchor = latest === undefined ? undefined : anchorsOf(latest).get(id);

    if (latest === undefined || anchor === undefined || anchor.lost) {
      return;
    }
    run(activateAnchor(id));
    opened.value = id;
    editor()?.revealNode(blockOf(latest.doc, anchor.range));
  };

  const views = computed<readonly CommentThreadView[]>(() => {
    const order = new Map(layout.value.map((anchor, index) => [anchor.id, index]));
    const lost = new Set(layout.value.flatMap((anchor) => (anchor.lost ? [anchor.id] : [])));

    return threads.value
      .map((thread) => ({
        ...thread,
        lost: placed.value && !thread.resolved && (lost.has(thread.id) || !order.has(thread.id)),
      }))
      .toSorted(
        (a, b) =>
          Number(a.resolved) - Number(b.resolved) ||
          (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
  });

  onMounted(async () => {
    unsubscribe = adapter.subscribe?.(doc, onEvent);

    const loaded = await attempt(() => adapter.list(doc, aborter.signal));

    loading = false;

    if (loaded !== undefined) {
      threads.value = loaded;
      placeAll();
      early.forEach(onEvent);
    }
    early.length = 0;
  });

  watch(editor, (api) => {
    const state = api?.state();

    if (state === undefined) {
      return;
    }

    read(state);
    placeAll();
  });

  onBeforeUnmount(() => {
    aborter.abort();
    unsubscribe?.();
  });

  return {
    plugin,
    user,
    threads: views,
    active,
    opened,
    drafting,
    failed,
    revision,
    action,
    spot,
    openAt,
    close,
    cancel,
    submit,
    reply,
    resolve,
    remove,
    activate,
  };
};
