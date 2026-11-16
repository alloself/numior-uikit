<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      class="nui-editor"
      :class="[
        `nui-editor--size-${size}`,
        {
          'nui-editor--invalid': isInvalid,
          'nui-editor--disabled': isDisabled,
          'nui-editor--readonly': isReadonly,
          'nui-editor--empty': empty,
          'nui-editor--bounded': maxHeight !== undefined,
        },
      ]"
      :style="bounds"
      ref="frame"
      @focusin="onFrameFocusin"
      @focusout="overlays.onFocusout"
      @pointerdown="overlays.onPointerdown"
      @pointermove="onFramePointermove"
      @pointerleave="handles.onPointerleave"
      @dragenter="wake"
    >
      <NuiEditorToolbar
        v-if="toolbarShown"
        ref="toolbar"
        class="nui-editor__toolbar"
        :docked="docked"
        :state="current"
        :options="toolOptions"
        :inserts="toolbarInserts"
        :disabled="isDisabled"
        :controls="controlAttrs.id"
        @run="onToolbarRun"
        @open="onInsertOpen"
        @link="overlays.openLink"
        @colour="overlays.colour"
        @leave="editor.focus()"
      />
      <div v-if="!ready" class="nui-editor__server" data-allow-mismatch="children">
        <NuiContent
          v-if="onServer"
          class="nui-editor__content nui-editor__static"
          :document="initial"
          :schema="schema"
        />
      </div>
      <div
        ref="content"
        class="nui-content nui-editor__content"
        :hidden="!ready"
        v-bind="{ ...contentAttrs, ...attrs }"
        @focus="onFocus"
        @blur="onBlur"
        @paste="onPaste"
        @keydown="onKeydown"
      />
      <span ref="range" class="nui-editor__range" aria-hidden="true">
        <span ref="anchor" class="nui-editor__anchor" />
      </span>
      <slot name="overlay" />
      <NuiEditorBlockHandle
        v-if="handlesShown && overlaid"
        ref="handle"
        v-model:open="handles.menuOpen.value"
        :state="current"
        :target="handles.slot.value"
        :dragging="handles.dragging.value"
        :block-menu="blockMenu"
        @run="onHandleRun"
        @grip="handles.onGripPointerdown"
        @container="handles.selectContainer"
      />
      <NuiEditorNodeViews
        v-if="ready"
        :entries="nodeViews.shown"
        :selected="selectedNode"
        :focused="overlays.focused.value"
        :editable="editable"
        :host="blockHost"
      />
      <NuiEditorPasteMenu
        v-if="overlaid"
        :pasted="links.pasted.value"
        :anchor="anchorElement"
        :provider="pastedProvider"
        :bookmark="schema.nodes.has('bookmark')"
        @select="onPasteChoice"
        @close="onPasteDismiss"
      />
      <NuiEditorUploads
        v-if="overlaid"
        v-model:open="mediaOpen"
        :uploads="uploads"
        :links="links"
        :schema="schema"
        :anchor="anchorElement"
        :kind="mediaKind"
        :accept="accept"
        @done="editor.focus()"
      />
      <div
        ref="ghost"
        class="nui-content nui-editor__ghost"
        :class="{ 'nui-editor__ghost--shown': handles.dragging.value }"
        aria-hidden="true"
        inert
      />
      <div
        ref="drop"
        class="nui-editor__drop"
        :class="{
          'nui-editor__drop--shown': handles.aiming.value,
          'nui-editor__drop--side': handles.aimingSide.value,
        }"
        aria-hidden="true"
      />
      <NuiEditorBubble
        v-if="bubbleToolbar && overlaid"
        ref="bubble"
        :state="current"
        :options="toolOptions"
        :anchor="anchorElement"
        :open="overlays.bubbleOpen.value"
        @run="onToolbarRun"
        @link="overlays.openLink"
        @colour="overlays.colour"
        @leave="editor.focus()"
      />
      <NuiEditorSuggestMenu
        v-if="overlaid"
        :id="slashId"
        class="nui-editor-slash"
        :entries="slashEntries"
        :active="slash.active.value"
        :anchor="anchorElement"
        :open="slash.open.value"
        :label="blockTexts.blocks"
        @select="onSlashChoose"
        @hover="slash.hover"
      />
      <NuiEditorSuggestMenu
        v-if="mentionsShown"
        :id="mentionsId"
        class="nui-editor-mentions"
        :entries="mentionEntries"
        :active="mention.active.value"
        :anchor="anchorElement"
        :open="mention.open.value"
        :label="blockTexts.mentions"
        :loading="mention.loading.value"
        :loading-label="blockTexts.mentionsLoading"
        :empty-label="mentionsEmpty"
        @select="onMentionChoose"
        @hover="mention.hover"
      >
        <template #leading="{ item }">
          <span class="nui-editor-mentions__avatar" aria-hidden="true">
            <NuiAvatar :src="avatarOf(item.value)" :name="item.label" size="sm" />
          </span>
        </template>
      </NuiEditorSuggestMenu>
      <NuiEditorLinkPanel
        v-if="hasLinks && overlaid"
        v-model:open="overlays.linkOpen.value"
        :anchor="anchorElement"
        :href="overlays.linkHref.value"
        :removable="overlays.linkRemovable.value"
        :valid="validLink"
        @apply="overlays.applyLink"
        @remove="overlays.removeLink"
        @cancel="overlays.closeLink"
      />
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts" generic="V extends NuiEditorValue | undefined">
import { Bookmark, SquarePlay } from '@lucide/vue';
import {
  CONTENT_COLOURS,
  contentSchema,
  embedProviders,
  NuiContent,
  NuiContentNodeType,
} from '@numior/content';
import {
  baseKeymap,
  blockSpots,
  commentAnchors,
  createState,
  definePlugin,
  detectPasteSource,
  history,
  inputRules,
  isEmptyDoc,
  keymap,
  markdownRules,
  pasteSchema,
  peerSpotsOf,
  pendingUploads,
  SelectionKind,
  toJSON,
  type Command,
  type Doc,
  type DocJSON,
  type EditorState,
  type ElementNode,
  type Keymap,
  type Transaction,
} from '@numior/editor-core';
import { createEditorView, type EditorView } from '@numior/editor-core/view';
import {
  Key,
  provideHighlighter,
  useFieldControl,
  useHighlighter,
  useMessages,
  type IconSource,
  type NuiHighlighter,
} from '@numior/primitives';
import { codeHighlightPlugin, createCodeHighlighter } from '../blocks/code/code-highlight';
import {
  NuiAvatar,
  NuiFieldFrame,
  NuiSize,
  optionElementId,
  type NuiListEntry,
  type NuiMenuEntry,
} from '@numior/vue';
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  ssrContextKey,
  useAttrs,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { blockContext } from '../blocks/block-context';
import { NO_PEERS, spotsInBlocks } from '../blocks/block-spots';
import type {
  NuiEditorBlock,
  NuiEditorBlockEditor,
  NuiEditorBlockHost,
} from '../blocks/block.types';
import { provideBlockStates } from '../blocks/define-block';
import { editorBlocks } from '../blocks/editor-blocks';
import { handlePlacement } from '../blocks/handle-placement';
import { createNodeViewHost } from '../blocks/node-view-host';
import { createNodeViews } from '../blocks/node-views';
import NuiEditorNodeViews from '../blocks/NuiEditorNodeViews.vue';
import { afterIdle, afterPaint } from './after-paint';
import NuiEditorBubble from '../bubble/NuiEditorBubble.vue';
import NuiEditorLinkPanel from '../link/NuiEditorLinkPanel.vue';
import NuiEditorToolbar from '../toolbar/NuiEditorToolbar.vue';
import NuiEditorBlockHandle from '../handle/NuiEditorBlockHandle.vue';
import { useBlockHandle } from '../handle/use-block-handle';
import { useMentions } from '../mentions/use-mentions';
import NuiEditorSuggestMenu from '../suggest/NuiEditorSuggestMenu.vue';
import { useSlash } from '../slash/use-slash';
import { belowItems, slashItems, type SlashItem } from '../slash/slash-items';
import NuiEditorUploads from '../uploads/NuiEditorUploads.vue';
import { provideEditorLinks } from '../links/links-context';
import type { LinkKind } from '../links/links.types';
import NuiEditorPasteMenu from '../links/NuiEditorPasteMenu.vue';
import { NO_EMBEDS, useEditorLinks } from '../links/use-editor-links';
import type { MediaKind } from '../uploads/uploads.types';
import { provideEditorUploads } from '../uploads/uploads-context';
import { useEditorUploads } from '../uploads/use-editor-uploads';
import { editorMessages } from './editor.messages';
import { useEditorValue, type EditorValue } from './use-editor-value';
import { useEditorOverlays } from './use-editor-overlays';
import { useLayoutWatch } from './use-layout-watch';
import {
  KeyCode,
  NuiEditorFormat,
  NuiEditorToolbarMode,
  type NuiEditorApi,
  type NuiEditorPaste,
  type NuiEditorProps,
  type NuiEditorValue,
} from './editor.types';
import { SlashItemKind } from '../suggest/suggest.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  size = NuiSize.Md,
  disabled = undefined,
  readonly = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
  schema = contentSchema,
  placeholder,
  autofocus = false,
  toolbar = NuiEditorToolbarMode.Both,
  colours = CONTENT_COLOURS,
  highlights = CONTENT_COLOURS,
  selectionActions = undefined,
  blockHandles = true,
  blocks = editorBlocks,
  highlighter = undefined,
  upload,
  accept,
  maxSize,
  maxHeight,
  embeds = NO_EMBEDS,
  linkMetadata,
  mentions,
  format = NuiEditorFormat.Html,
  plugins: extraPlugins = [],
  ids,
} = defineProps<NuiEditorProps>();

const model = defineModel<V>({ required: true });

const emit = defineEmits<{
  change: [document: DocJSON];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  paste: [paste: NuiEditorPaste];
}>();

const attrs = useAttrs();
const blockTexts = useMessages(editorMessages);

provideBlockStates();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
  field,
  frame: fieldFrame,
} = useFieldControl(
  () => ({
    id,
    disabled,
    readonly,
    required,
    invalid,
    label,
    description,
    error,
  }),
  {
    commit: () => {
      settleValue();
    },
  },
);

const contentElement = useTemplateRef<HTMLElement>('content');
const frameElement = useTemplateRef<HTMLElement>('frame');
const rangeElement = useTemplateRef<HTMLElement>('range');
const anchorElement = useTemplateRef<HTMLElement>('anchor');
const toolbarElement = useTemplateRef<InstanceType<typeof NuiEditorToolbar>>('toolbar');
const bubbleElement = useTemplateRef<InstanceType<typeof NuiEditorBubble>>('bubble');
const handleComponent = useTemplateRef<InstanceType<typeof NuiEditorBlockHandle>>('handle');
const dropElement = useTemplateRef<HTMLElement>('drop');
const ghostElement = useTemplateRef<HTMLElement>('ghost');

const handleElement = computed(() => {
  const element: unknown = handleComponent.value?.$el;

  return element instanceof HTMLElement ? element : null;
});

const limitedSchema = schema.restrict({
  values: {
    ...(schema.marks.has('color') ? { color: { name: colours } } : {}),
    ...(schema.marks.has('highlight') ? { highlight: { name: highlights } } : {}),
  },
});

const slashId = useId();

const hasMedia = schema.nodes.has('image') || schema.nodes.has('file');
const mediaOpen = ref(false);
const mediaKind = ref<MediaKind>('image');

const openMedia = (kind: MediaKind): void => {
  mediaKind.value = kind;
  mediaOpen.value = true;
};

const MEDIA_SLASH: readonly {
  readonly kind: MediaKind;
  readonly icon: IconSource;
  readonly keywords: readonly string[];
}[] = [
  {
    kind: 'image',
    icon: 'image',
    keywords: ['image', 'picture', 'photo', 'img', 'картинка', 'изображение'],
  },
  {
    kind: 'file',
    icon: 'file',
    keywords: ['file', 'attachment', 'upload', 'pdf', 'файл', 'вложение'],
  },
  {
    kind: 'embed',
    icon: SquarePlay,
    keywords: ['embed', 'video', 'youtube', 'figma', 'встроить', 'видео'],
  },
  {
    kind: 'bookmark',
    icon: Bookmark,
    keywords: ['bookmark', 'link', 'card', 'закладка', 'ссылка'],
  },
];

const offered = (kind: MediaKind): boolean =>
  schema.nodes.has(kind) && (kind !== NuiContentNodeType.Embed || providers.value.length > 0);

const mediaSlash = (): readonly SlashItem[] =>
  MEDIA_SLASH.reduce<SlashItem[]>((found, entry) => {
    if (offered(entry.kind)) {
      found.push({
        key: entry.kind,
        label: blockTexts.value[entry.kind],
        icon: entry.icon,
        keywords: entry.keywords,
        kind: 'open',
        open: () => {
          openMedia(entry.kind);
        },
      });
    }
    return found;
  }, []);

const inserts = computed((): readonly SlashItem[] => [
  ...slashItems(schema, blockTexts.value),
  ...blocks.flatMap((block) =>
    schema.nodes.has(block.name) ? (block.slash?.(blockTexts.value) ?? []) : [],
  ),
  ...mediaSlash(),
]);

const toolbarInserts = computed(() => belowItems(inserts.value));

const slash = useSlash({
  state: () => current.value,
  enabled: () => editable.value && overlaid.value && overlays.focused.value,
  run: (command) => run(command),
  items: () => inserts.value,
});

const slashEntries = computed((): NuiListEntry<string>[] =>
  slash.items.value.map((item) => ({ value: item.key, label: item.label, icon: item.icon })),
);

const onSlashChoose = (key: string): void => {
  const item = slash.items.value.find((candidate) => candidate.key === key);

  if (item === undefined) {
    return;
  }

  slash.choose(item);
};

const mentionsId = useId();

const mention = useMentions({
  state: () => current.value,
  enabled: () =>
    editable.value && overlaid.value && overlays.focused.value && schema.nodes.has('mention'),
  run: (command) => run(command),
  search: () => mentions,
});

const mentionEntries = computed((): NuiListEntry<string>[] =>
  mention.people.value.map((person) => ({
    value: person.id,
    label: person.label,
    description: person.description,
  })),
);

const mentionsShown = computed(() => overlaid.value && mentions !== undefined);

const mentionsEmpty = computed(() =>
  mention.failed.value ? blockTexts.value.mentionsFailed : blockTexts.value.mentionsEmpty,
);

const avatarOf = (user: string | undefined): string | undefined =>
  mention.people.value.find((person) => person.id === user)?.avatar;

const onMentionChoose = (user: string): void => {
  const person = mention.people.value.find((candidate) => candidate.id === user);

  if (person === undefined) {
    return;
  }

  mention.choose(person);
};

let view: EditorView | undefined;

const blockEditor: NuiEditorBlockEditor = { element: (nodeId) => view?.nodeDOM(nodeId) };

const keysOf = (keys: NonNullable<NuiEditorBlock['keymap']>): Keymap =>
  typeof keys === 'function' ? keys(blockEditor) : keys;

const configuredHighlighter = useHighlighter();
const NO_HIGHLIGHT: NuiHighlighter = { languages: [], tokens: () => undefined };

if (highlighter !== undefined) {
  provideHighlighter(highlighter === false ? NO_HIGHLIGHT : highlighter);
}

const providers = computed(() => embedProviders(embeds));

const links = useEditorLinks({
  schema,
  providers: () => providers.value,
  metadata: () => linkMetadata,
  run: (command) => run(command),
  state: () => current.value,
  editable: () => editable.value,
});

provideEditorLinks({
  loading: links.loading,
  get previews() {
    return linkMetadata !== undefined;
  },
  embedOf: links.embedOf,
  refresh: links.refresh,
  turn: links.turn,
  change: links.change,
  accepts: links.accepts,
});

const pastedProvider = computed(() => {
  const link = links.pasted.value;

  return link === undefined || !schema.nodes.has('embed')
    ? undefined
    : links.embedOf(link.url)?.provider.label;
});

const onPasteChoice = (kind: LinkKind): void => {
  links.convert(kind);
  editor.focus();
};

const onPasteDismiss = (): void => {
  links.dismiss();
  editor.focus();
};

const uploads = useEditorUploads({
  schema,
  upload: () => upload,
  accept: () => accept,
  maxSize: () => maxSize,
  state: () => current.value,
  run: (command) => run(command),
  document: () => contentElement.value?.ownerDocument,
  editable: () => editable.value,
});

provideEditorUploads(uploads);

const editorPlugins = [
  ...extraPlugins,
  links.plugin,
  ...(hasMedia ? [pendingUploads, uploads.plugin] : []),
  ...(schema.nodes.has('code_block') ? [codeHighlightPlugin()] : []),
  slash.plugin,
  mention.plugin,
  pasteSchema(limitedSchema),
  inputRules(markdownRules),
  ...blocks.flatMap((block) => (block.keymap === undefined ? [] : [keymap(keysOf(block.keymap))])),
  ...blocks.flatMap((block) =>
    block.conceals === undefined
      ? []
      : [
          definePlugin({
            name: `conceals-${block.name}`,
            props: { conceals: block.conceals(blockEditor) },
          }),
        ],
  ),
  keymap(baseKeymap),
  history(),
  commentAnchors,
  blockSpots(),
];

const nodeViews = createNodeViewHost();

const sync: EditorValue = useEditorValue({
  schema,
  model,
  format: () => format,
  state: () => current.value,
  receive: (doc) => {
    replace(doc);
  },
});

const initial = sync.initial;

const current = shallowRef<EditorState>(createState({ doc: initial, plugins: editorPlugins, ids }));
const ready = ref(false);
const overlaid = ref(false);
const onServer = inject(ssrContextKey, null) !== null;
const empty = ref(isEmptyDoc(initial));

const editable = computed(() => !isDisabled.value && !isReadonly.value);

const bounds = computed(() =>
  maxHeight === undefined ? undefined : { '--_max-height': maxHeight },
);

const spotsByBlock = computed(() => spotsInBlocks(peerSpotsOf(current.value)));

const selectedNode = computed(() =>
  current.value.selection.kind === SelectionKind.Node ? current.value.selection.id : undefined,
);

const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
const coarsePointer = useMediaQuery('(pointer: coarse)');

const actionsOnly = computed(
  () => isReadonly.value && !isDisabled.value && (selectionActions?.length ?? 0) > 0,
);

const fixedToolbar = computed(
  () =>
    (toolbar === NuiEditorToolbarMode.Fixed || toolbar === NuiEditorToolbarMode.Both) &&
    (!isReadonly.value || (actionsOnly.value && coarsePointer.value)),
);

const docked = computed(() => fixedToolbar.value && coarsePointer.value && editable.value);

const bubbleToolbar = computed(
  () =>
    (actionsOnly.value && !coarsePointer.value) ||
    ((toolbar === NuiEditorToolbarMode.Bubble || toolbar === NuiEditorToolbarMode.Both) &&
      (finePointer.value || toolbar === NuiEditorToolbarMode.Bubble)),
);

const hasLinks = schema.marks.has('link');

const toolOptions = computed(() => ({
  colours,
  highlights,
  selectionActions,
  actionsOnly: actionsOnly.value,
  blockMenu: !bubbleToolbar.value,
}));

const validLink = (href: string): boolean =>
  schema.marks.get('link')?.attrs.href?.verify?.(href) ?? true;

const suggestList = computed(() => {
  if (slash.open.value) {
    return { id: slashId, option: optionElementId(slashId, slash.active.value) };
  }
  return mention.open.value
    ? {
        id: mentionsId,
        option:
          mention.people.value.length > 0
            ? optionElementId(mentionsId, mention.active.value)
            : undefined,
      }
    : undefined;
});

const contentAttrs = computed(() => ({
  id: controlAttrs.value.id,
  'aria-labelledby': field.value?.labelledBy.value,
  'aria-describedby': controlAttrs.value['aria-describedby'],
  'aria-invalid': controlAttrs.value['aria-invalid'],
  'aria-required': controlAttrs.value.required || undefined,
  'aria-readonly': isReadonly.value || undefined,
  'aria-disabled': isDisabled.value || undefined,
  tabindex: isReadonly.value && !isDisabled.value ? 0 : undefined,
  'aria-placeholder': placeholder,
  'aria-controls': suggestList.value?.id,
  'aria-activedescendant': suggestList.value?.option,
}));

const onPaste = (event: ClipboardEvent): void => {
  if (!editable.value) {
    return;
  }

  emit('paste', { source: detectPasteSource(event.clipboardData?.getData('text/html') ?? '') });
};

let publishing = false;

const publishNow = (): void => {
  if (!publishing) {
    return;
  }
  publishing = false;

  const json = toJSON(current.value.doc);

  sync.changed(json);
  emit('change', json);
};

const publish = (state: EditorState): void => {
  empty.value = isEmptyDoc(state.doc);
  sync.paused();

  if (publishing) {
    return;
  }

  publishing = true;
  void afterPaint().then(publishNow);
};

const settleValue = (): void => {
  publishNow();
  sync.flush();
};

const replace = (doc: Doc): void => {
  publishing = false;
  empty.value = isEmptyDoc(doc);
  current.value = createState({ doc, plugins: editorPlugins, ids });
  view?.update(current.value);
  code.reset();
  code.update(current.value);
  uploads.reset();
};

const writing = ref(false);

const onFocus = (event: FocusEvent): void => {
  writing.value = true;
  emit('focus', event);
};

const onBlur = (event: FocusEvent): void => {
  settleValue();
  emit('blur', event);
};

const dispatch = (tr: Transaction): void => {
  if (view === undefined) {
    return;
  }
  const applied = view.state.applyTransaction(tr);

  view.update(applied.state);
  current.value = applied.state;
  links.follow(applied.state);
  code.update(applied.state);
  if (!applied.transactions.some((step) => step.changed)) {
    return;
  }

  publish(applied.state);
};

const code = createCodeHighlighter(
  () => (highlighter === false ? null : (highlighter ?? configuredHighlighter)),
  dispatch,
  () => current.value,
);

const run: NuiEditorApi['run'] = (command) => view !== undefined && command(view.state, dispatch);

const blockHost: NuiEditorBlockHost = {
  run,
  focus: () => view?.focus(),
  peers: (block) => spotsByBlock.value.get(block) ?? NO_PEERS,
};

const stuckBar = (): number => {
  const bar: unknown = docked.value ? undefined : toolbarElement.value?.$el;

  return bar instanceof HTMLElement ? bar.offsetHeight : 0;
};

const layout = useLayoutWatch(frameElement, contentElement);

const caretLayerOpen = (): boolean =>
  slash.open.value || mention.open.value || mediaOpen.value || links.pasted.value !== undefined;

const overlays = useEditorOverlays({
  frame: frameElement,
  content: contentElement,
  range: rangeElement,
  watchLayout: layout.watch,
  bar: stuckBar,
  view: () => view,
  state: () => current.value,
  run: (command) => run(command),
  focus: () => view?.focus(),
  bubble: () => bubbleToolbar.value,
  caret: caretLayerOpen,
  active: () => editable.value || actionsOnly.value,
});

const editor: NuiEditorApi = {
  state: () => view?.state,
  run,
  focus: () => view?.focus(),
  flush: () => {
    settleValue();
  },
  coordsAt: (pos) => (view?.drawn(pos) ? view.coordsAtPos(pos) : undefined),
  posAt: (x, y) => view?.posAtCoords(x, y),
  contentBox: () => contentElement.value?.getBoundingClientRect(),
  revealNode: (nodeId) => {
    const pos = view?.state.doc.positionOf(nodeId);

    if (view === undefined || pos === undefined) {
      return;
    }

    view.draw(pos);
    view.nodeDOM(nodeId)?.scrollIntoView({ block: 'nearest' });
  },
  watchLayout: layout.watch,
};

const toolbarShown = computed(
  () => fixedToolbar.value && (!docked.value || (overlays.focused.value && writing.value)),
);

watch(
  () => overlays.focused.value,
  (value) => {
    writing.value &&= value;
  },
);

const handlesShown = computed(() => blockHandles && editable.value);

const handles = useBlockHandle({
  frame: frameElement,
  content: contentElement,
  handle: handleElement,
  drop: dropElement,
  ghost: ghostElement,
  view: () => view,
  state: () => current.value,
  enabled: () => handlesShown.value && overlaid.value,
  focused: () => overlays.focused.value && writing.value,
  layerOpen: () => caretLayerOpen() || overlays.linkOpen.value || overlays.bubbleOpen.value,
  run: (command) => run(command),
  placement: (node) => handlePlacement(blocks, node),
});

const wake = (): void => {
  overlaid.value ||= ready.value;
};

const onFrameFocusin = (): void => {
  wake();
  overlays.onFocusin();
};

const onFramePointermove = (event: PointerEvent): void => {
  wake();
  handles.onPointermove(event);
};

const blockMenu = (node: ElementNode): NuiMenuEntry[] =>
  blocks.flatMap((block) =>
    block.name === node.type
      ? (block.menu?.(
          node,
          blockContext(node.id, blockHost, () => view?.nodeDOM(node.id)),
          blockTexts.value,
        ) ?? [])
      : [],
  );

const onHandleRun = (command: Command): void => {
  run(command);
  editor.focus();
};

const onInsertOpen = (item: SlashItem): void => {
  if (item.kind !== SlashItemKind.Open) {
    return;
  }

  item.open();
};

const onToolbarRun = (command: Command, refocus: boolean): void => {
  run(command);
  if (!refocus) {
    return;
  }

  editor.focus();
};

const isLinkKey = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && !event.altKey && event.code === KeyCode.K;

const onKeydown = (event: KeyboardEvent): void => {
  if (view === undefined || view.inWidget(event.target)) {
    return;
  }
  if (event.altKey && event.key === Key.F10) {
    event.preventDefault();
    (toolbarElement.value ?? bubbleElement.value)?.focus();
  } else if (isLinkKey(event) && hasLinks && editable.value) {
    event.preventDefault();
    overlays.openLink();
  }
};

watch(editable, (value) => {
  view?.setEditable(value);
});

const DOCK_GAP = 8;

const hiddenUnder = (caret: { top: number; bottom: number }, dock: HTMLElement): number => {
  const top = dock.getBoundingClientRect().top;

  return caret.top < top && caret.bottom + DOCK_GAP > top ? caret.bottom + DOCK_GAP - top : 0;
};

watch(
  () => current.value.selection,
  (selection) => {
    const dock: unknown = toolbarElement.value?.$el;

    const typing =
      docked.value && view?.hasFocus() === true && selection.kind === SelectionKind.Text;

    const caret = typing ? view?.coordsAtPos(selection.head) : undefined;

    const overlap =
      caret !== undefined && dock instanceof HTMLElement ? hiddenUnder(caret, dock) : 0;

    if (overlap <= 0 || !(dock instanceof HTMLElement)) {
      return;
    }

    dock.ownerDocument.defaultView?.scrollBy({ top: overlap });
  },
  { flush: 'post' },
);

const highlightWhenIdle = async (): Promise<void> => {
  await afterIdle();
  if (view === undefined) {
    return;
  }

  code.update(current.value);
};

onMounted(() => {
  const element = contentElement.value;

  if (element === null) {
    return;
  }

  view = createEditorView(element, {
    state: current.value,
    editable: editable.value,
    dispatch,
    nodeViews: createNodeViews(element.ownerDocument, schema, blocks, nodeViews.sink),
    widget: uploads.widget,
    chunks: nodeViews.chunks,
  });

  ready.value = true;

  void highlightWhenIdle();

  if (!autofocus) {
    return;
  }

  view.focus();
});

onBeforeUnmount(() => {
  settleValue();
  code.stop();
  links.stop();
  nodeViews.stop();
  view?.destroy();
  view = undefined;
});

defineExpose({ editor });
</script>
