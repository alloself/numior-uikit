import { decorationSet, widgetDecoration } from '../decorations/decorations';
import type { DecorationSet } from '../decorations/decorations.types';
import type { Doc, ResolvedPos } from '../doc/doc.types';
import { emptyTextblock } from '../doc/empty';
import { nodeSize } from '../model/node';
import type { ElementNode } from '../model/node.types';
import { createMetaKey, definePlugin } from '../state/plugin';
import { selectionRange, textSelection } from '../state/selection';
import type { Command, EditorState, Plugin, Transaction } from '../state/state.types';
import type { PendingUpload, PlaceBuilder, UploadChange } from './uploads.types';

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

const lineAt = (doc: Doc, at: number | undefined): ResolvedPos | undefined => {
  if (at === undefined || at < 0 || at > doc.size) {
    return undefined;
  }
  const $at = doc.resolve(at);

  return $at.depth > 0 && isTextblock(doc, $at.parent) ? $at : undefined;
};

const movedPoint = (tr: Transaction, doc: Doc, at: number | undefined): number | undefined => {
  const next = at === undefined ? undefined : tr.mapping.map(at, 1);

  return lineAt(doc, next) === undefined ? undefined : next;
};

const moved = (
  uploads: readonly PendingUpload[],
  tr: Transaction,
  doc: Doc,
): readonly PendingUpload[] =>
  tr.changed && uploads.length > 0
    ? uploads.map((upload) => ({
        ...upload,
        pos: boundary(doc, tr.mapping.map(upload.pos, 1)),
        at: movedPoint(tr, doc, upload.at),
      }))
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

export const uploadPoint = (state: EditorState): number | undefined => {
  const { selection, doc } = state;

  return selection.kind === 'text' && lineAt(doc, selection.head) !== undefined
    ? selectionRange(doc, selection).to
    : undefined;
};

const lineFor = (tr: Transaction, node: ElementNode): ElementNode | undefined => {
  const line = emptyTextblock(tr.doc.schema, tr.newId());

  return line === undefined
    ? undefined
    : tr.doc.schema.element(line.type, { id: line.id, content: [node] });
};

const insertedInText = (tr: Transaction, node: ElementNode, at: number): boolean => {
  try {
    tr.insert(at, [node]);
    return true;
  } catch (error) {
    if (error instanceof RangeError) {
      return false;
    }
    throw error;
  }
};

const insertInline = (
  tr: Transaction,
  node: ElementNode,
  at: number | undefined,
  pos: number,
): number | undefined => {
  if (at !== undefined && lineAt(tr.doc, at) !== undefined && insertedInText(tr, node, at)) {
    return at + nodeSize(node);
  }
  const line = lineFor(tr, node);
  const place = line === undefined ? undefined : placeFor(tr.doc, pos, line);

  if (line === undefined || place === undefined) {
    return undefined;
  }
  tr.insert(place, [line]);
  return place + 1 + nodeSize(node);
};

const placeNode = (
  tr: Transaction,
  build: PlaceBuilder,
  at: number | undefined,
  pos: number,
): number | undefined => {
  const line = lineAt(tr.doc, at);
  const node = build(tr, line === undefined || line.parent.content.length === 0);

  if (tr.doc.schema.nodes.get(node.type)?.inline === true) {
    return insertInline(tr, node, at, pos);
  }
  const place = placeFor(tr.doc, pos, node);

  if (place === undefined) {
    return undefined;
  }
  tr.insert(place, [node]);
  return place + nodeSize(node);
};

export const placeBlock =
  (build: PlaceBuilder, pos?: number): Command =>
  (state, dispatch) => {
    const tr = state.tr;
    const inline = pos === undefined ? uploadPoint(state) : undefined;
    const after = placeNode(tr, build, inline, pos ?? uploadPlace(state));

    if (after === undefined) {
      return false;
    }
    if (inline !== undefined && lineAt(tr.doc, after) !== undefined) {
      tr.setSelection(textSelection(after));
    }
    dispatch?.(tr);
    return true;
  };

export const startUploads =
  (ids: readonly string[], pos?: number, at?: number): Command =>
  (state, dispatch) => {
    const place = pos ?? uploadPlace(state);
    const point = pos === undefined ? uploadPoint(state) : at;

    if (ids.length === 0) {
      return false;
    }

    dispatch?.(
      state.tr.setMeta(uploadChange, {
        kind: 'add',
        uploads: ids.map((id) => ({ id, pos: place, at: point })),
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
  (id: string, build: PlaceBuilder): Command =>
  (state, dispatch) => {
    const upload = uploadsOf(state).find((candidate) => candidate.id === id);

    if (upload === undefined) {
      return false;
    }
    const tr = state.tr;
    const after = placeNode(tr, build, upload.at, upload.pos);

    tr.setMeta(uploadChange, { kind: 'drop', ids: [id] });
    dispatch?.(tr);
    return after !== undefined;
  };
