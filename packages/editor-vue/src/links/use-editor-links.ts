import {
  NuiContentNodeType,
  resolveEmbed,
  webAddress,
  type NuiEmbed,
  type NuiEmbedProvider,
} from '@numior/content';
import {
  addToHistory,
  definePlugin,
  inlineText,
  InputIntentKind,
  insertMarked,
  nodeSize,
  placeBlock,
  SelectionKind,
  setMark,
  type Attrs,
  type Command,
  type EditorState,
  type ElementNode,
  type NodeId,
  type Plugin,
  type Schema,
  type Transaction,
} from '@numior/editor-core';
import { onScopeDispose, shallowReactive, shallowRef, type ShallowRef } from 'vue';
import type {
  LinkChange,
  LinkKind,
  NuiEditorLinkMetadata,
  NuiEditorLinkPreview,
  PastedLink,
} from './links.types';

export interface EditorLinkOptions {
  readonly schema: Schema;
  readonly providers: () => readonly NuiEmbedProvider[];
  readonly metadata: () => NuiEditorLinkMetadata | undefined;
  readonly run: (command: Command) => boolean;
  readonly state: () => EditorState;
  readonly editable: () => boolean;
}

export interface EditorLinks {
  readonly plugin: Plugin;
  readonly pasted: ShallowRef<PastedLink | undefined>;
  readonly loading: ReadonlySet<NodeId>;
  embedOf(url: string, provider?: string): NuiEmbed | undefined;
  insert(kind: LinkKind, url: string): boolean;
  convert(kind: LinkKind): boolean;
  turn(id: NodeId, kind: LinkKind): boolean;
  change(id: NodeId, change: LinkChange): boolean;
  accepts(kind: LinkKind, url: string): boolean;
  refresh(id: NodeId): void;
  follow(state: EditorState): void;
  dismiss(): void;
  stop(): void;
}

export const NO_EMBEDS: readonly NuiEmbedProvider[] = [];

const SINGLE = /^\S+$/u;

const textOf = (value: string | undefined): string => value?.trim() ?? '';

const webOf = (value: string | undefined): string =>
  value !== undefined && webAddress(value) !== undefined ? value : '';

const previewAttrs = (preview: NuiEditorLinkPreview) => ({
  title: textOf(preview.title),
  description: textOf(preview.description),
  image: webOf(preview.image),
  icon: webOf(preview.icon),
  site: textOf(preview.site),
});

const emptyParagraph = (state: EditorState): ElementNode | undefined => {
  const { selection, doc } = state;

  if (selection.kind !== SelectionKind.Text || selection.anchor !== selection.head) {
    return undefined;
  }
  const { parent } = doc.resolve(selection.head);

  return parent.type === NuiContentNodeType.Paragraph && parent.content.length === 0
    ? parent
    : undefined;
};

const setLinkAttrs =
  (id: NodeId, attrs: Attrs, remembered: boolean): Command =>
  (state, dispatch) => {
    const at = state.doc.positionOf(id);

    if (at === undefined) {
      return false;
    }
    dispatch?.(state.tr.setNodeAttrs(at, attrs).setMeta(addToHistory, remembered));
    return true;
  };

const setPreview = (id: NodeId, preview: NuiEditorLinkPreview, kept: readonly string[]): Command =>
  setLinkAttrs(
    id,
    Object.fromEntries(
      Object.entries(previewAttrs(preview)).filter(([name]) => !kept.includes(name)),
    ),
    false,
  );

const detailAttrs = (change: LinkChange): Attrs => ({
  ...(change.title === undefined ? {} : { title: change.title }),
  ...(change.description === undefined ? {} : { description: change.description }),
});

const replacing =
  (link: PastedLink) =>
  (node: ElementNode): Command =>
  (state, dispatch) => {
    const from = state.doc.positionOf(link.block);
    const block = state.doc.byId(link.block);

    if (from === undefined || block === undefined || inlineText(block) !== link.url) {
      return false;
    }
    const tr = state.tr;

    tr.delete(from + 1, from + nodeSize(block) - 1);
    tr.insert(from, [node]);
    dispatch?.(tr);
    return true;
  };

const replacingNode =
  (id: NodeId) =>
  (node: ElementNode): Command =>
  (state, dispatch) => {
    const from = state.doc.positionOf(id);
    const old = state.doc.byId(id);

    if (from === undefined || old === undefined) {
      return false;
    }
    const tr = state.tr;

    tr.insert(from, [node]);
    tr.delete(from + nodeSize(node), from + nodeSize(node) + nodeSize(old));
    dispatch?.(tr);
    return true;
  };

export const useEditorLinks = (options: EditorLinkOptions): EditorLinks => {
  const { schema } = options;
  const pasted = shallowRef<PastedLink | undefined>();
  const loading = shallowReactive(new Set<NodeId>());
  const controllers = new Map<NodeId, AbortController>();

  const embedOf = (url: string, provider?: string): NuiEmbed | undefined =>
    resolveEmbed(url, options.providers(), provider);

  const nodeFor = (tr: Transaction, kind: LinkKind, url: string): ElementNode | undefined => {
    const embed = kind === NuiContentNodeType.Embed ? embedOf(url) : undefined;

    if (kind === NuiContentNodeType.Embed) {
      return embed === undefined || !schema.nodes.has('embed')
        ? undefined
        : schema.element('embed', { id: tr.newId(), attrs: { url, provider: embed.provider.id } });
    }
    return schema.nodes.has('bookmark')
      ? schema.element('bookmark', {
          id: tr.newId(),
          attrs: { url, site: webAddress(url)?.hostname ?? '' },
        })
      : undefined;
  };

  const accepts = (kind: LinkKind, url: string): boolean =>
    kind === NuiContentNodeType.Embed ? embedOf(url) !== undefined : webAddress(url) !== undefined;

  const addressAttrs = (type: string, url: string): Attrs | undefined => {
    switch (type) {
      case NuiContentNodeType.Embed: {
        const embed = embedOf(url);

        return embed === undefined ? undefined : { url, provider: embed.provider.id };
      }
      case NuiContentNodeType.Bookmark: {
        const address = webAddress(url);

        return address === undefined
          ? undefined
          : { ...previewAttrs({}), url, site: address.hostname };
      }
      default:
        return undefined;
    }
  };

  const refresh = (id: NodeId, kept: readonly string[] = []): void => {
    const adapter = options.metadata();
    const address = options.state().doc.byId(id)?.attrs.url;

    if (adapter === undefined || typeof address !== 'string') {
      return;
    }
    controllers.get(id)?.abort();

    const controller = new AbortController();

    controllers.set(id, controller);
    loading.add(id);

    adapter(address, { signal: controller.signal })
      .then((preview) => {
        if (!controller.signal.aborted) {
          options.run(setPreview(id, preview, kept));
        }
        return preview;
      })
      .catch(() => undefined)
      .finally(() => {
        if (controllers.get(id) === controller) {
          controllers.delete(id);
          loading.delete(id);
        }
      });
  };

  const inserted = (
    kind: LinkKind,
    url: string,
    place: (node: ElementNode) => Command,
  ): boolean => {
    let created: ElementNode | undefined;

    const done = options.run((state, dispatch) => {
      const tr = state.tr;

      created = nodeFor(tr, kind, url);
      return created !== undefined && place(created)(state, dispatch);
    });

    if (done && created !== undefined && kind === NuiContentNodeType.Bookmark) {
      refresh(created.id);
    }
    return done;
  };

  const pasteLink = (
    url: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void,
  ): boolean => {
    const { selection } = state;
    const block = emptyParagraph(state);

    if (selection.kind === SelectionKind.Text && selection.anchor !== selection.head) {
      return setMark('link', { href: url })(state, dispatch);
    }
    const done = insertMarked(url, 'link', { href: url })(state, dispatch);

    pasted.value = done && block !== undefined ? { url, block: block.id } : undefined;
    return done;
  };

  const plugin = definePlugin({
    name: 'editor-links',
    props: {
      handleIntent: (intent, state, dispatch) => {
        const url = intent.kind === InputIntentKind.Paste ? intent.text.trim() : '';

        if (
          intent.kind !== InputIntentKind.Paste ||
          (intent.html ?? '') !== '' ||
          !SINGLE.test(url) ||
          webAddress(url) === undefined ||
          !options.editable() ||
          !schema.marks.has('link')
        ) {
          return false;
        }
        return pasteLink(url, state, dispatch);
      },
    },
  });

  onScopeDispose(() => {
    for (const controller of controllers.values()) {
      controller.abort();
    }
  });

  return {
    plugin,
    pasted,
    loading,
    embedOf,
    insert: (kind, url) => inserted(kind, url, (node) => placeBlock(() => node)),
    convert: (kind) => {
      const link = pasted.value;

      pasted.value = undefined;
      return link !== undefined && inserted(kind, link.url, replacing(link));
    },
    refresh,
    accepts,
    change: (id, change) => {
      const node = options.state().doc.byId(id);
      const moved = node !== undefined && node.attrs.url !== change.url;
      const address = moved ? addressAttrs(node.type, change.url) : {};
      const details = detailAttrs(change);

      if (node === undefined || address === undefined) {
        return false;
      }
      if (!moved && Object.keys(details).length === 0) {
        return true;
      }
      controllers.get(id)?.abort();

      const done = options.run(setLinkAttrs(id, { ...address, ...details }, true));

      if (done && moved && node.type === NuiContentNodeType.Bookmark) {
        refresh(id, Object.keys(details));
      }
      return done;
    },
    turn: (id, kind) => {
      const url = options.state().doc.byId(id)?.attrs.url;

      return typeof url === 'string' && inserted(kind, url, replacingNode(id));
    },
    follow: (state) => {
      const link = pasted.value;
      const block = link === undefined ? undefined : state.doc.byId(link.block);
      const { selection } = state;

      const inside =
        block !== undefined &&
        selection.kind === SelectionKind.Text &&
        state.doc.resolve(selection.head).parent.id === block.id;

      if (link !== undefined && (!inside || inlineText(block) !== link.url)) {
        pasted.value = undefined;
      }
    },
    dismiss: () => {
      pasted.value = undefined;
    },
    stop: () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
    },
  };
};
