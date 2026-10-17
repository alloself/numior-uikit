import {
  definePlugin,
  dropUploads,
  finishUpload,
  placeBlock,
  startUploads,
  uploadPlace,
  type Command,
  type EditorState,
  type ElementNode,
  type NodeId,
  type Plugin,
  type Schema,
  type Transaction,
} from '@numior/editor-core';
import {
  formatFileSize,
  useLocale,
  useMessages,
  useUploadQueue,
  validateFiles,
  type FileRejection,
} from '@numior/primitives';
import { computed, onScopeDispose, ref, shallowReactive, type ComputedRef, type Ref } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type {
  MediaKind,
  NuiEditorUploadAdapter,
  NuiEditorUploadItem,
  UploadCard,
  UploadTarget,
} from './uploads.types';

export interface EditorUploadOptions {
  readonly schema: Schema;
  readonly upload: () => NuiEditorUploadAdapter | undefined;
  readonly accept: () => string | undefined;
  readonly maxSize: () => number | undefined;
  readonly state: () => EditorState;
  readonly run: (command: Command) => boolean;
  readonly document: () => Document | undefined;
}

export interface EditorUploads {
  readonly plugin: Plugin;
  readonly enabled: ComputedRef<boolean>;
  readonly cards: ComputedRef<readonly UploadCard[]>;
  readonly replacing: ComputedRef<ReadonlyMap<NodeId, NuiEditorUploadItem>>;
  readonly announcement: Ref<string>;
  widget(key: string): HTMLElement | undefined;
  add(files: readonly File[], target?: UploadTarget, accept?: string): void;
  cancel(id: string): void;
  retry(id: string): void;
  insertLink(kind: MediaKind, url: string): boolean;
  replace(id: NodeId, file: File): void;
}

interface LinkedFile {
  readonly url: string;
  readonly name: string;
  readonly size: number | null;
  readonly type: string;
}

const UPLOAD_CLASS = 'nui-editor__upload';

const isImage = (type: string): boolean => type.startsWith('image/');

const nameOfLink = (url: string): string => {
  const path = url.split(/[?#]/u)[0] ?? '';
  const last = path.split('/').findLast((part) => part !== '') ?? url;

  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};

const replaceSource =
  (id: NodeId, src: string): Command =>
  (state, dispatch) => {
    const from = state.doc.positionOf(id);

    if (from === undefined) {
      return false;
    }
    dispatch?.(state.tr.setNodeAttrs(from, { src }));
    return true;
  };

export const useEditorUploads = (options: EditorUploadOptions): EditorUploads => {
  const texts = useMessages(editorMessages);
  const locale = useLocale();
  const items = ref<NuiEditorUploadItem[]>([]);
  const announcement = ref('');
  const targets = new Map<string, UploadTarget>();
  const elements = shallowReactive(new Map<string, HTMLElement>());
  const previews = shallowReactive(new Map<string, string>());
  const { schema } = options;

  const enabled = computed(() => options.upload() !== undefined);

  const announce = (text: string): void => {
    announcement.value = text;
  };

  const forget = (id: string): void => {
    const preview = previews.get(id);

    if (preview !== undefined) {
      URL.revokeObjectURL(preview);
    }
    previews.delete(id);
    targets.delete(id);
    elements.get(id)?.remove();
    elements.delete(id);
  };

  const kindOf = (type: string): MediaKind | undefined => {
    if (isImage(type) && schema.nodes.has('image')) {
      return 'image';
    }
    return schema.nodes.has('file') ? 'file' : undefined;
  };

  const nodeFor = (tr: Transaction, kind: MediaKind, file: LinkedFile): ElementNode =>
    kind === 'image'
      ? schema.element('image', { id: tr.newId(), attrs: { src: file.url } })
      : schema.element('file', {
          id: tr.newId(),
          attrs: { url: file.url, name: file.name, size: file.size, type: file.type },
        });

  const place = (item: NuiEditorUploadItem, url: string): void => {
    const target = targets.get(item.id);
    const kind = kindOf(item.type);
    const file = { url, name: item.name, size: item.size, type: item.type };

    if (target?.kind === 'replace') {
      options.run(replaceSource(target.id, url));
    } else if (kind === undefined) {
      options.run(dropUploads([item.id]));
    } else {
      options.run(finishUpload(item.id, (tr) => nodeFor(tr, kind, file)));
    }
  };

  const queue = useUploadQueue<{ readonly url: string }>({
    items,
    upload: (file, context) => {
      const adapter = options.upload();

      return adapter === undefined
        ? Promise.reject(new Error(texts.value.uploadUnavailable))
        : adapter(file, context);
    },
    onDone: (item) => {
      const url = item.status === 'done' ? item.result?.url : undefined;

      if (url !== undefined) {
        place(item, url);
        announce(texts.value.uploaded({ name: item.name }));
      }
      queue.remove(item.id);
      forget(item.id);
    },
    onError: (item) => {
      announce(texts.value.uploadFailed({ name: item.name }));
    },
  });

  const refusal = (rejection: FileRejection): string => {
    const { name } = rejection.file;
    const limit = options.maxSize();

    switch (rejection.error.reason) {
      case 'type':
        return texts.value.uploadType({ name });
      case 'size':
        return texts.value.uploadSize({
          name,
          size: formatFileSize(limit ?? rejection.file.size, locale.value),
        });
      default:
        return texts.value.uploadFailed({ name });
    }
  };

  const elementFor = (id: string): HTMLElement | undefined => {
    const element = options.document()?.createElement('div');

    if (element !== undefined) {
      element.className = UPLOAD_CLASS;
      elements.set(id, element);
    }
    return element;
  };

  const add = (files: readonly File[], target?: UploadTarget, accept?: string): void => {
    if (!enabled.value) {
      announce(texts.value.uploadUnavailable);
      return;
    }

    const { accepted, rejected } = validateFiles(files, {
      accept: accept ?? options.accept(),
      maxSize: options.maxSize(),
      maxFiles: target?.kind === 'replace' ? 1 : undefined,
    });

    if (rejected[0] !== undefined) {
      announce(rejected.map(refusal).join(' '));
    }
    if (accepted.length === 0) {
      return;
    }
    const spot = target ?? { kind: 'place', pos: uploadPlace(options.state()) };
    const created = queue.add(accepted.map((file) => ({ file })));

    for (const item of created) {
      targets.set(item.id, spot);
      if (isImage(item.type) && typeof URL.createObjectURL === 'function' && item.file) {
        previews.set(item.id, URL.createObjectURL(item.file));
      }
      if (spot.kind === 'place') {
        elementFor(item.id);
      }
    }
    if (spot.kind === 'place') {
      options.run(
        startUploads(
          created.map((item) => item.id),
          spot.pos,
        ),
      );
    }
  };

  const plugin = definePlugin({
    name: 'editor-uploads',
    props: {
      handleIntent: (intent, state) => {
        if (intent.kind !== 'files') {
          return false;
        }
        add(intent.files, { kind: 'place', pos: uploadPlace(state) });
        return true;
      },
    },
  });

  const cards = computed(() =>
    items.value.flatMap((item) => {
      const element = elements.get(item.id);

      return element === undefined ? [] : [{ item, element, preview: previews.get(item.id) }];
    }),
  );

  const replacing = computed(
    () =>
      new Map(
        items.value.flatMap((item): [NodeId, NuiEditorUploadItem][] => {
          const target = targets.get(item.id);

          return target?.kind === 'replace' ? [[target.id, item]] : [];
        }),
      ),
  );

  const insertLink = (kind: MediaKind, url: string): boolean =>
    schema.nodes.has(kind) &&
    options.run(
      placeBlock((tr) => nodeFor(tr, kind, { url, name: nameOfLink(url), size: null, type: '' })),
    );

  onScopeDispose(() => {
    for (const id of targets.keys()) {
      forget(id);
    }
  });

  return {
    plugin,
    enabled,
    cards,
    replacing,
    announcement,
    widget: (key) => elements.get(key),
    add,
    cancel: (id) => {
      queue.remove(id);
      options.run(dropUploads([id]));
      forget(id);
    },
    retry: (id) => {
      queue.retry(id);
    },
    insertLink,
    replace: (id, file) => {
      add([file], { kind: 'replace', id }, 'image/*');
    },
  };
};
