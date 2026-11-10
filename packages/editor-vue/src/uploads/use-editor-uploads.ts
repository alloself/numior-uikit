import {
  definePlugin,
  dropUploads,
  finishUpload,
  InputIntentKind,
  placeBlock,
  startUploads,
  uploadPlace,
  uploadPoint,
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
  UploadReason,
  UploadStatus,
  useLocale,
  useMessages,
  useUploadQueue,
  validateFiles,
  type FileRejection,
} from '@numior/primitives';
import { computed, onScopeDispose, ref, shallowReactive, type ComputedRef, type Ref } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import {
  UploadTargetKind,
  type NuiEditorUploadAdapter,
  type NuiEditorUploadItem,
  type UploadCard,
  type UploadKind,
  type UploadTarget,
} from './uploads.types';
import { NuiContentNodeType } from '@numior/content';

export interface EditorUploadOptions {
  readonly schema: Schema;
  readonly upload: () => NuiEditorUploadAdapter | undefined;
  readonly accept: () => string | undefined;
  readonly maxSize: () => number | undefined;
  readonly state: () => EditorState;
  readonly run: (command: Command) => boolean;
  readonly document: () => Document | undefined;
  readonly editable: () => boolean;
}

export interface EditorUploads {
  readonly plugin: Plugin;
  readonly enabled: ComputedRef<boolean>;
  readonly cards: ComputedRef<readonly UploadCard[]>;
  readonly replacing: ComputedRef<ReadonlyMap<NodeId, NuiEditorUploadItem>>;
  readonly images: ComputedRef<string | undefined>;
  readonly announcement: Ref<string>;
  widget(key: string): HTMLElement | undefined;
  add(files: readonly File[], target?: UploadTarget, accept?: string): void;
  cancel(id: string): void;
  retry(id: string): void;
  insertLink(kind: UploadKind, url: string): boolean;
  replace(id: NodeId, file: File): void;
  reset(): void;
}

interface LinkedFile {
  readonly url: string;
  readonly name: string;
  readonly size: number | null;
  readonly type: string;
}

const UPLOAD_CLASS = 'nui-editor__upload';

const isImage = (type: string): boolean => type.startsWith('image/');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg']);

const imageAccept = (accept: string | undefined): string | undefined => {
  if (accept === undefined || accept.trim() === '') {
    return 'image/*';
  }

  const tokens = accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.startsWith('image/') || IMAGE_EXTENSIONS.has(token));

  return tokens.length === 0 ? undefined : tokens.join(',');
};

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
  const images = computed(() => imageAccept(options.accept()));

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

  const kindOf = (type: string): UploadKind | undefined => {
    if (isImage(type) && schema.nodes.has('image')) {
      return 'image';
    }
    return schema.nodes.has('file') ? 'file' : undefined;
  };

  const nodeFor = (
    tr: Transaction,
    kind: UploadKind,
    file: LinkedFile,
    alone: boolean,
  ): ElementNode =>
    kind === NuiContentNodeType.Image
      ? schema.element('image', {
          id: tr.newId(),
          attrs: alone ? { src: file.url, wrap: 'break' } : { src: file.url },
        })
      : schema.element('file', {
          id: tr.newId(),
          attrs: { url: file.url, name: file.name, size: file.size, type: file.type },
        });

  const accepts = (kind: UploadKind, url: string): boolean =>
    schema.nodes
      .get(kind)
      ?.attrs[kind === NuiContentNodeType.Image ? 'src' : 'url']?.verify?.(url) ?? true;

  const placed = (item: NuiEditorUploadItem, url: string): boolean => {
    const target = targets.get(item.id);
    const kind = target?.kind === UploadTargetKind.Replace ? 'image' : kindOf(item.type);
    const file = { url, name: item.name, size: item.size, type: item.type };

    if (kind === undefined || !accepts(kind, url)) {
      return false;
    }
    return target?.kind === UploadTargetKind.Replace
      ? options.run(replaceSource(target.id, url))
      : options.run(finishUpload(item.id, (tr, alone) => nodeFor(tr, kind, file, alone)));
  };

  const place = (item: NuiEditorUploadItem, url: string): void => {
    if (placed(item, url)) {
      announce(texts.value.uploaded({ name: item.name }));
    } else {
      options.run(dropUploads([item.id]));
      announce(texts.value.uploadLost({ name: item.name }));
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
      const url = item.status === UploadStatus.Done ? item.result?.url : undefined;

      if (url !== undefined) {
        place(item, url);
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
      case UploadReason.Type:
        return texts.value.uploadType({ name });
      case UploadReason.Size:
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

  const cancel = (id: string): void => {
    queue.remove(id);
    options.run(dropUploads([id]));
    forget(id);
  };

  const accepted = (
    files: readonly File[],
    target: UploadTarget | undefined,
    accept: string | undefined,
  ): readonly File[] => {
    const checked = validateFiles(files, {
      accept: accept ?? options.accept(),
      maxSize: options.maxSize(),
      maxFiles: target?.kind === UploadTargetKind.Replace ? 1 : undefined,
    });

    if (checked.rejected.length > 0) {
      announce(checked.rejected.map(refusal).join(' '));
    }
    return checked.accepted;
  };

  const supersede = (spot: UploadTarget): void => {
    for (const [id, existing] of targets) {
      if (
        spot.kind === UploadTargetKind.Replace &&
        existing.kind === UploadTargetKind.Replace &&
        existing.id === spot.id
      ) {
        cancel(id);
      }
    }
  };

  const preview = (item: NuiEditorUploadItem): void => {
    if (isImage(item.type) && typeof URL.createObjectURL === 'function' && item.file) {
      previews.set(item.id, URL.createObjectURL(item.file));
    }
  };

  const enqueue = (files: readonly File[], spot: UploadTarget): void => {
    supersede(spot);

    const created = queue.add(files.map((file) => ({ file })));

    for (const item of created) {
      targets.set(item.id, spot);
    }
    if (spot.kind !== UploadTargetKind.Place) {
      return;
    }

    for (const item of created) {
      preview(item);
      elementFor(item.id);
    }

    options.run(
      startUploads(
        created.map((item) => item.id),
        spot.pos,
        spot.at,
      ),
    );
  };

  const add = (files: readonly File[], target?: UploadTarget, accept?: string): void => {
    if (!options.editable()) {
      return;
    }
    if (!enabled.value) {
      announce(texts.value.uploadUnavailable);
      return;
    }

    const valid = accepted(files, target, accept);

    if (valid.length > 0) {
      enqueue(
        valid,
        target ?? {
          kind: 'place',
          pos: uploadPlace(options.state()),
          at: uploadPoint(options.state()),
        },
      );
    }
  };

  const plugin = definePlugin({
    name: 'editor-uploads',
    props: {
      handleIntent: (intent, state) => {
        if (intent.kind !== InputIntentKind.Files) {
          return false;
        }
        add(intent.files, { kind: 'place', pos: uploadPlace(state), at: uploadPoint(state) });
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

          return target?.kind === UploadTargetKind.Replace ? [[target.id, item]] : [];
        }),
      ),
  );

  const insertLink = (kind: UploadKind, url: string): boolean =>
    schema.nodes.has(kind) &&
    options.run(
      placeBlock((tr, alone) =>
        nodeFor(tr, kind, { url, name: nameOfLink(url), size: null, type: '' }, alone),
      ),
    );

  onScopeDispose(() => {
    for (const id of targets.keys()) {
      forget(id);
    }
  });

  return {
    plugin,
    enabled,
    images,
    cards,
    replacing,
    announcement,
    widget: (key) => elements.get(key),
    add,
    cancel,
    retry: (id) => {
      queue.retry(id);
    },
    insertLink,
    reset: () => {
      for (const id of targets.keys()) {
        queue.remove(id);
        forget(id);
      }
    },
    replace: (id, file) => {
      add([file], { kind: 'replace', id }, images.value);
    },
  };
};
