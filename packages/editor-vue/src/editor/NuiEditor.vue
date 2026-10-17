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
        },
      ]"
      ref="frame"
      @focusin="overlays.onFocusin"
      @focusout="overlays.onFocusout"
      @pointerdown="overlays.onPointerdown"
      @pointermove="handles.onPointermove"
      @pointerleave="handles.onPointerleave"
    >
      <NuiEditorToolbar
        v-if="fixedToolbar"
        ref="toolbar"
        class="nui-editor__toolbar"
        :state="current"
        :options="toolOptions"
        :inserts="inserts"
        :disabled="isDisabled"
        :controls="controlAttrs.id"
        @run="onToolbarRun"
        @open="onInsertOpen"
        @link="overlays.openLink"
        @colour="overlays.colour"
        @leave="editor.focus()"
      />
      <NuiContent
        v-if="!ready"
        class="nui-editor__content nui-editor__static"
        :document="initial"
        :schema="schema"
      />
      <div
        ref="content"
        class="nui-content nui-editor__content"
        :hidden="!ready"
        v-bind="{ ...contentAttrs, ...attrs }"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
        @paste="onPaste"
        @keydown="onKeydown"
      />
      <span ref="anchor" class="nui-editor__anchor" aria-hidden="true" />
      <NuiEditorBlockHandle
        v-if="handlesShown && ready"
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
        :run="run"
        :focus="editor.focus"
      />
      <NuiEditorPasteMenu
        v-if="ready"
        :pasted="links.pasted.value"
        :anchor="anchorElement"
        :provider="pastedProvider"
        :bookmark="schema.nodes.has('bookmark')"
        @choose="onPasteChoice"
        @dismiss="onPasteDismiss"
      />
      <NuiEditorUploads
        v-if="ready"
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
        v-if="bubbleToolbar && ready"
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
      <NuiEditorSlashMenu
        v-if="ready"
        :id="slashId"
        :items="slash.items.value"
        :active="slash.active.value"
        :anchor="anchorElement"
        :open="slash.open.value"
        @choose="slash.choose"
        @hover="slash.hover"
      />
      <NuiEditorLinkPanel
        v-if="hasLinks && ready"
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

<script setup lang="ts">
import { CONTENT_COLOURS, contentSchema, embedProviders, NuiContent } from '@numior/content';
import {
  baseKeymap,
  createEmptyDoc,
  pasteSchema,
  createState,
  detectPasteSource,
  fromJSON,
  history,
  inputRules,
  isEmptyDoc,
  keymap,
  markdownRules,
  pendingUploads,
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
  provideHighlighter,
  provideIconDefaults,
  useFieldControl,
  useHighlighter,
  useMessages,
  type NuiHighlighter,
} from '@numior/primitives';
import { codeHighlightPlugin, createCodeHighlighter } from '../blocks/code/code-highlight';
import { NuiFieldFrame, optionElementId, type NuiMenuEntry } from '@numior/vue';
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toRaw,
  useAttrs,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { blockContext } from '../blocks/block-context';
import type { NuiEditorBlock, NuiEditorBlockEditor } from '../blocks/block.types';
import { provideBlockStates } from '../blocks/define-block';
import { editorBlocks } from '../blocks/editor-blocks';
import { createNodeViewHost } from '../blocks/node-view-host';
import { createNodeViews } from '../blocks/node-views';
import NuiEditorNodeViews from '../blocks/NuiEditorNodeViews.vue';
import NuiEditorBubble from '../bubble/NuiEditorBubble.vue';
import { editorIcons } from '../icons/editor-icons';
import NuiEditorLinkPanel from '../link/NuiEditorLinkPanel.vue';
import NuiEditorToolbar from '../toolbar/NuiEditorToolbar.vue';
import NuiEditorBlockHandle from '../handle/NuiEditorBlockHandle.vue';
import { useBlockHandle } from '../handle/use-block-handle';
import NuiEditorSlashMenu from '../slash/NuiEditorSlashMenu.vue';
import { useSlash } from '../slash/use-slash';
import { slashItems, type SlashItem } from '../slash/slash-items';
import NuiEditorUploads from '../uploads/NuiEditorUploads.vue';
import { provideEditorLinks } from '../links/links-context';
import type { LinkKind } from '../links/links.types';
import NuiEditorPasteMenu from '../links/NuiEditorPasteMenu.vue';
import { NO_EMBEDS, useEditorLinks } from '../links/use-editor-links';
import type { MediaKind } from '../uploads/uploads.types';
import { provideEditorUploads } from '../uploads/uploads-context';
import { useEditorUploads } from '../uploads/use-editor-uploads';
import { editorMessages } from './editor.messages';
import { useEditorOverlays } from './use-editor-overlays';
import type { NuiEditorApi, NuiEditorPaste, NuiEditorProps } from './editor.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
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
  toolbar = 'fixed',
  colours = CONTENT_COLOURS,
  highlights = CONTENT_COLOURS,
  blockHandles = true,
  blocks = editorBlocks,
  highlighter = undefined,
  upload,
  accept,
  maxSize,
  embeds = NO_EMBEDS,
  linkMetadata,
} = defineProps<NuiEditorProps>();

const document = defineModel<DocJSON | undefined>('document');

const emit = defineEmits<{
  change: [document: DocJSON];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  paste: [paste: NuiEditorPaste];
}>();

const attrs = useAttrs();
const blockTexts = useMessages(editorMessages);

provideIconDefaults(editorIcons);
provideBlockStates();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
  field,
  frame: fieldFrame,
} = useFieldControl(() => ({
  id,
  disabled,
  readonly,
  required,
  invalid,
  label,
  description,
  error,
}));

const contentElement = useTemplateRef<HTMLElement>('content');
const frameElement = useTemplateRef<HTMLElement>('frame');
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

const MEDIA_SLASH: readonly { readonly kind: MediaKind; readonly keywords: readonly string[] }[] = [
  { kind: 'image', keywords: ['image', 'picture', 'photo', 'img', 'картинка', 'изображение'] },
  { kind: 'file', keywords: ['file', 'attachment', 'upload', 'pdf', 'файл', 'вложение'] },
  { kind: 'embed', keywords: ['embed', 'video', 'youtube', 'figma', 'встроить', 'видео'] },
  { kind: 'bookmark', keywords: ['bookmark', 'link', 'card', 'закладка', 'ссылка'] },
];

const offered = (kind: MediaKind): boolean =>
  schema.nodes.has(kind) && (kind !== 'embed' || providers.value.length > 0);

const mediaSlash = (): readonly SlashItem[] =>
  MEDIA_SLASH.filter((entry) => offered(entry.kind)).map((entry) => ({
    key: entry.kind,
    label: blockTexts.value[entry.kind],
    icon: entry.kind,
    keywords: entry.keywords,
    kind: 'open',
    open: () => {
      openMedia(entry.kind);
    },
  }));

const inserts = computed((): readonly SlashItem[] => [
  ...slashItems(schema, blockTexts.value),
  ...blocks.flatMap((block) =>
    schema.nodes.has(block.name) ? (block.slash?.(blockTexts.value) ?? []) : [],
  ),
  ...mediaSlash(),
]);

const slash = useSlash({
  state: () => current.value,
  enabled: () => editable.value && ready.value && overlays.focused.value,
  run: (command) => run(command),
  items: () => inserts.value,
});

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
  relink: links.relink,
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

const plugins = [
  links.plugin,
  ...(hasMedia ? [pendingUploads, uploads.plugin] : []),
  ...(schema.nodes.has('code_block') ? [codeHighlightPlugin()] : []),
  slash.plugin,
  pasteSchema(limitedSchema),
  inputRules(markdownRules),
  ...blocks.flatMap((block) => (block.keymap === undefined ? [] : [keymap(keysOf(block.keymap))])),
  keymap(baseKeymap),
  history(),
];

const nodeViews = createNodeViewHost();

const docOf = (json: DocJSON | undefined): Doc => {
  const read = json === undefined ? undefined : fromJSON(schema, json);

  return read?.ok === true ? read.doc : createEmptyDoc(schema);
};

const initial = docOf(document.value === undefined ? undefined : toRaw(document.value));
const current = shallowRef<EditorState>(createState({ doc: initial, plugins }));
const ready = ref(false);
const empty = ref(isEmptyDoc(initial));
let written: DocJSON | undefined = document.value === undefined ? undefined : toRaw(document.value);

const editable = computed(() => !isDisabled.value && !isReadonly.value);

const selectedNode = computed(() =>
  current.value.selection.kind === 'node' ? current.value.selection.id : undefined,
);

const fixedToolbar = computed(
  () => (toolbar === 'fixed' || toolbar === 'both') && !isReadonly.value,
);

const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');

const bubbleToolbar = computed(
  () => (toolbar === 'bubble' || toolbar === 'both') && (finePointer.value || toolbar === 'bubble'),
);

const hasLinks = schema.marks.has('link');
const toolOptions = computed(() => ({ colours, highlights }));

const validLink = (href: string): boolean =>
  schema.marks.get('link')?.attrs.href?.verify?.(href) ?? true;

const slashOption = computed(() =>
  slash.open.value && slash.items.value.length > 0
    ? optionElementId(slashId, slash.active.value)
    : undefined,
);

const contentAttrs = computed(() => ({
  id: controlAttrs.value.id,
  'aria-labelledby': field.value?.labelledBy.value,
  'aria-describedby': controlAttrs.value['aria-describedby'],
  'aria-invalid': controlAttrs.value['aria-invalid'],
  'aria-required': controlAttrs.value.required || undefined,
  'aria-readonly': isReadonly.value || undefined,
  'aria-disabled': isDisabled.value || undefined,
  'aria-placeholder': placeholder,
  'aria-controls': slash.open.value ? slashId : undefined,
  'aria-activedescendant': slashOption.value,
}));

const onPaste = (event: ClipboardEvent): void => {
  if (editable.value) {
    emit('paste', { source: detectPasteSource(event.clipboardData?.getData('text/html') ?? '') });
  }
};

const publish = (state: EditorState): void => {
  written = toJSON(state.doc);
  empty.value = isEmptyDoc(state.doc);
  document.value = written;
  emit('change', written);
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
  if (applied.transactions.some((step) => step.changed)) {
    publish(applied.state);
  }
};

const code = createCodeHighlighter(
  () => (highlighter === false ? null : (highlighter ?? configuredHighlighter)),
  dispatch,
  () => current.value,
);

const run: NuiEditorApi['run'] = (command) => view !== undefined && command(view.state, dispatch);

const overlays = useEditorOverlays({
  frame: frameElement,
  content: contentElement,
  anchor: anchorElement,
  view: () => view,
  state: () => current.value,
  run: (command) => run(command),
  focus: () => view?.focus(),
  bubble: () => bubbleToolbar.value,
  caret: () => slash.open.value || mediaOpen.value || links.pasted.value !== undefined,
  editable: () => editable.value,
});

const editor: NuiEditorApi = {
  state: () => view?.state,
  run,
  focus: () => view?.focus(),
};

const handlesShown = computed(() => blockHandles && editable.value);

const handles = useBlockHandle({
  frame: frameElement,
  content: contentElement,
  handle: handleElement,
  drop: dropElement,
  ghost: ghostElement,
  view: () => view,
  state: () => current.value,
  enabled: () => handlesShown.value && ready.value,
  focused: () => overlays.focused.value,
  run: (command) => run(command),
  placement: (type) => blocks.find((block) => block.name === type)?.handle ?? 'push',
});

const blockMenu = (node: ElementNode): NuiMenuEntry[] =>
  blocks
    .filter((block) => block.name === node.type)
    .flatMap(
      (block) =>
        block.menu?.(
          node,
          blockContext(node.id, run, editor.focus, () => view?.nodeDOM(node.id)),
          blockTexts.value,
        ) ?? [],
    );

const onHandleRun = (command: Command): void => {
  run(command);
  editor.focus();
};

const onInsertOpen = (item: SlashItem): void => {
  if (item.kind === 'open') {
    item.open();
  }
};

const onToolbarRun = (command: Command, refocus: boolean): void => {
  run(command);
  if (refocus) {
    editor.focus();
  }
};

const isLinkKey = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && !event.altKey && event.code === 'KeyK';

const onKeydown = (event: KeyboardEvent): void => {
  if (view === undefined || view.inWidget(event.target)) {
    return;
  }
  if (event.altKey && event.key === 'F10') {
    event.preventDefault();
    (toolbarElement.value ?? bubbleElement.value)?.focus();
  } else if (isLinkKey(event) && hasLinks && editable.value) {
    event.preventDefault();
    overlays.openLink();
  }
};

watch(document, (value) => {
  const json = value === undefined ? undefined : toRaw(value);

  if (view === undefined || json === written) {
    return;
  }
  const doc = docOf(json);

  written = json;
  empty.value = isEmptyDoc(doc);
  current.value = createState({ doc, plugins });
  view.update(current.value);
  code.reset();
  code.update(current.value);
  uploads.reset();
});

watch(editable, (value) => {
  view?.setEditable(value);
});

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

  code.update(current.value);
  ready.value = true;
  if (autofocus) {
    view.focus();
  }
});

onBeforeUnmount(() => {
  code.stop();
  links.stop();
  nodeViews.stop();
  view?.destroy();
  view = undefined;
});

defineExpose({ editor });
</script>
