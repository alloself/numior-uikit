import { decorationSet, widgetDecoration } from '../decorations/decorations';
import type { DecorationSet } from '../decorations/decorations.types';
import type { Doc } from '../doc/doc.types';
import type { ElementNode } from '../model/node.types';
import { createMetaKey, definePlugin } from '../state/plugin';
import { selectionRange } from '../state/selection';
import type { Command, EditorState, Plugin, Transaction } from '../state/state.types';
import type { PendingUpload, UploadChange } from './uploads.types';

const uploadChange = createMetaKey<UploadChange>('uploads');

const NONE: readonly PendingUpload[] = [];

const changed = (
  uploads: readonly PendingUpload[],
  change: UploadChange | undefined,
): readonly PendingUpload[] => {
  switch (change?.kind) {
    case 'add':
      return [...uploads, ...change.uploads];
    case 'drop':
      return uploads.filter((upload) => !change.ids.includes(upload.id));
    case undefined:
      return uploads;
  }
};

const isTextblock = (doc: Doc, node: ElementNode): boolean =>
  doc.schema.nodes.get(node.type)?.inlineContent === true;

const boundary = (doc: Doc, pos: number): number => {
  const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.size));

  return $pos.depth > 0 && isTextblock(doc, $pos.parent) ? $pos.after($pos.depth) : $pos.pos;
};

const moved = (
  uploads: readonly PendingUpload[],
  tr: Transaction,
  doc: Doc,
): readonly PendingUpload[] =>
  tr.changed && uploads.length > 0
    ? uploads.map((upload) => ({ ...upload, pos: boundary(doc, tr.mapping.map(upload.pos, 1)) }))
    : uploads;

const sets = new WeakMap<readonly PendingUpload[], DecorationSet>();

const decorationsOf = (uploads: readonly PendingUpload[]): DecorationSet => {
  const known = sets.get(uploads);

  if (known !== undefined) {
    return known;
  }

  const set = decorationSet(
    [],
    [],
    uploads.map((upload) => widgetDecoration(upload.pos, upload.id)),
  );

  sets.set(uploads, set);
  return set;
};

export const pendingUploads: Plugin<readonly PendingUpload[]> = definePlugin<
  readonly PendingUpload[]
>({
  name: 'uploads',
  state: {
    init: () => NONE,
    apply: (tr, value, _before, after) =>
      changed(moved(value, tr, after.doc), tr.getMeta(uploadChange)),
  },
  props: {
    decorations: (state) => decorationsOf(pendingUploads.getState(state) ?? NONE),
  },
});

export const uploadsOf = (state: EditorState): readonly PendingUpload[] =>
  pendingUploads.getState(state) ?? NONE;

export const uploadPlace = (state: EditorState): number => {
  const range = selectionRange(state.doc, state.selection);
  const $pos = state.doc.resolve(range.to);

  if ($pos.depth < 1 || !isTextblock(state.doc, $pos.parent)) {
    return range.to;
  }
  return $pos.parent.content.length === 0 ? $pos.before($pos.depth) : $pos.after($pos.depth);
};

const fitsAt = (doc: Doc, pos: number, node: ElementNode): boolean => {
  const $pos = doc.resolve(pos);
  const { parent, index } = $pos;
  const content = [...parent.content.slice(0, index), node, ...parent.content.slice(index)];

  return (
    $pos.textOffset === 0 &&
    doc.schema.nodes.get(parent.type)?.content.matchContent(content)?.validEnd === true
  );
};

const placeFor = (doc: Doc, pos: number, node: ElementNode): number | undefined => {
  const at = Math.min(Math.max(pos, 0), doc.size);
  const $pos = doc.resolve(at);

  const candidates = [
    at,
    ...Array.from({ length: $pos.depth }, (_, step) => $pos.after($pos.depth - step)),
    doc.size,
  ];

  return candidates.find((candidate) => fitsAt(doc, candidate, node));
};

export const placeBlock =
  (build: (tr: Transaction) => ElementNode, pos?: number): Command =>
  (state, dispatch) => {
    const tr = state.tr;
    const node = build(tr);
    const at = placeFor(tr.doc, pos ?? uploadPlace(state), node);

    if (at === undefined) {
      return false;
    }
    tr.insert(at, [node]);
    dispatch?.(tr);
    return true;
  };

export const startUploads =
  (ids: readonly string[], pos?: number): Command =>
  (state, dispatch) => {
    const at = pos ?? uploadPlace(state);

    if (ids.length === 0) {
      return false;
    }

    dispatch?.(
      state.tr.setMeta(uploadChange, {
        kind: 'add',
        uploads: ids.map((id) => ({ id, pos: at })),
      }),
    );

    return true;
  };

export const dropUploads =
  (ids: readonly string[]): Command =>
  (state, dispatch) => {
    const known = uploadsOf(state).filter((upload) => ids.includes(upload.id));

    if (known.length > 0) {
      dispatch?.(state.tr.setMeta(uploadChange, { kind: 'drop', ids }));
    }
    return known.length > 0;
  };

export const finishUpload =
  (id: string, build: (tr: Transaction) => ElementNode): Command =>
  (state, dispatch) => {
    const upload = uploadsOf(state).find((candidate) => candidate.id === id);

    if (upload === undefined) {
      return false;
    }
    const tr = state.tr;
    const node = build(tr);
    const at = placeFor(tr.doc, upload.pos, node);

    tr.setMeta(uploadChange, { kind: 'drop', ids: [id] });
    if (at !== undefined) {
      tr.insert(at, [node]);
    }
    dispatch?.(tr);
    return at !== undefined;
  };
