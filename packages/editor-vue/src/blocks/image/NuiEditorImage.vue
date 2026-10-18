<template>
  <div
    class="nui-editor-image"
    :class="{
      'nui-editor-image--selected': selected,
      'nui-editor-image--resizing': resizing,
    }"
  >
    <div ref="frame" class="nui-editor-image__frame">
      <img
        ref="picture"
        class="nui-content__picture"
        :src="src"
        :alt="alt"
        draggable="false"
        @load="measure"
      />
      <div v-if="pending !== undefined" class="nui-editor-image__busy">
        <NuiProgress
          class="nui-editor-image__progress"
          size="sm"
          :value="percent"
          :label="texts.uploading({ percent })"
        />
      </div>
      <template v-if="editable">
        <span ref="corner" class="nui-editor__corner" />
        <span
          v-for="grip in GRIPS"
          :key="`${grip.edge}-${grip.side}`"
          class="nui-editor-image__grip"
          :class="`nui-editor-image__grip--at-${grip.edge}-${grip.side}`"
          v-bind="gripAttrs(grip)"
          @pointerdown="onGripDown(grip, $event)"
          @keydown="onGripKeydown"
        />
        <NuiPopover
          v-if="tooled"
          class="nui-editor-image__toolbar"
          :open="barOpen"
          v-bind="barSpot"
          mode="manual"
          padding="sm"
          @toggle="fitBar"
        >
          <div ref="bar" class="nui-editor-image__bar" role="toolbar" :aria-label="texts.image">
            <NuiToggleGroup
              :model-value="wrap"
              :items="wrapItems"
              :label="texts.imageWrap"
              size="sm"
              icon-only
              required
              @update:model-value="setWrap"
            />
            <NuiToggleGroup
              v-if="captioned"
              :model-value="align"
              :items="alignItems"
              :label="texts.imageAlign"
              size="sm"
              icon-only
              required
              @update:model-value="setAlign"
            />
            <NuiTooltip v-for="action in actions" :key="action.key" placement="bottom">
              <template #trigger="{ attrs }">
                <NuiButton
                  v-bind="{ ...attrs, ...actionAttrs(action) }"
                  variant="ghost"
                  tone="neutral"
                  size="sm"
                  :icon="action.icon"
                  :aria-label="action.label"
                  @click="action.run?.()"
                />
              </template>
              {{ action.label }}
            </NuiTooltip>
            <input
              ref="picker"
              class="nui-editor-image__picker"
              type="file"
              :accept="uploads?.images.value"
              tabindex="-1"
              aria-hidden="true"
              @change="onPick"
            />
          </div>
          <NuiPopover
            v-model:open="describing"
            :anchor="bar"
            placement="bottom-end"
            :offset="8"
            padding="sm"
          >
            <form class="nui-editor-image__alt" @submit.prevent="saveAlt">
              <NuiField :label="texts.imageAlt" :description="texts.imageAltHint">
                <NuiInput v-model="altDraft" size="sm" autofocus />
              </NuiField>
              <div class="nui-editor-image__actions">
                <NuiButton type="submit" size="sm">{{ texts.imageAltSave }}</NuiButton>
              </div>
            </form>
          </NuiPopover>
        </NuiPopover>
      </template>
    </div>
    <NuiEditorCaption
      v-if="captioned"
      ref="caption"
      :node="node"
      :editor="editor"
      :editable="editable"
      :selected="selected"
    />
  </div>
</template>

<script setup lang="ts">
import { onlyIf } from '../../editor/only-if';
import { useMessages, type IconAlias } from '@numior/primitives';
import {
  NuiButton,
  NuiField,
  NuiInput,
  NuiPopover,
  NuiProgress,
  NuiToggleGroup,
  NuiTooltip,
  type NuiToggleItem,
} from '@numior/vue';
import { useResizeObserver } from '@vueuse/core';
import type { NuiContentAlign, NuiContentWrap } from '@numior/content';
import { computed, ref, useTemplateRef, watch, type HTMLAttributes } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import NuiEditorCaption from '../caption/NuiEditorCaption.vue';
import { useEditorUploadContext } from '../../uploads/uploads-context';
import type { NuiEditorBlockViewProps } from '../block.types';
import {
  WIDE_STEP,
  WIDTH_STEP,
  alignOf,
  aspectOf,
  clampShare,
  draggedShare,
  lineWidthOf,
  pullOf,
  wrapOf,
} from './image-size';

type GripSide = 'start' | 'end';

interface ImageAction {
  readonly key: string;
  readonly icon: IconAlias;
  readonly label: string;
  readonly href?: string | undefined;
  readonly run?: (() => void) | undefined;
}

type GripEdge = 'top' | 'bottom';

interface Grip {
  readonly edge: GripEdge;
  readonly side: GripSide;
  readonly lift: number;
}

const GRIPS: readonly Grip[] = [
  { edge: 'top', side: 'start', lift: -1 },
  { edge: 'top', side: 'end', lift: -1 },
  { edge: 'bottom', side: 'start', lift: 1 },
  { edge: 'bottom', side: 'end', lift: 1 },
];

const MIN_PERCENT = 20;

const MAX_PERCENT = 100;

const HIDDEN_GRIP = { 'aria-hidden': 'true' } as const;

const { node, element, selected, focused, editable, editor } =
  defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);
const uploads = useEditorUploadContext();
const picker = useTemplateRef<HTMLInputElement>('picker');
const bar = useTemplateRef<HTMLElement>('bar');
const frame = useTemplateRef<HTMLElement>('frame');
const roomy = ref(true);
const corner = useTemplateRef<HTMLElement>('corner');
const captionView = useTemplateRef<{ fit(): void }>('caption');
const picture = useTemplateRef<HTMLImageElement>('picture');
const resizing = ref(false);
const describing = ref(false);
const altDraft = ref('');
const measured = ref(1);
const tooled = ref(selected);

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const src = computed(() => textOf(node.attrs.src));
const alt = computed(() => textOf(node.attrs.alt));
const align = computed(() => alignOf(node.attrs.align));
const wrap = computed(() => wrapOf(node.attrs.wrap));
const captioned = computed(() => wrap.value !== 'inline');
const centred = computed(() => align.value === 'center' && wrap.value === 'break');
const barOpen = computed(() => selected && focused && !resizing.value);

const barSpot = computed(() =>
  roomy.value
    ? { anchor: corner.value, placement: 'bottom-end' as const, offset: 0 }
    : { anchor: frame.value, placement: 'top-start' as const, offset: 8 },
);

const gripAttrs = (grip: Grip): HTMLAttributes =>
  grip.edge === 'bottom' && grip.side === 'end' ? slider.value : HIDDEN_GRIP;

const share = computed(() =>
  typeof node.attrs.width === 'number' ? node.attrs.width : measured.value,
);

const widthPercent = computed(() => Math.round(share.value * 100));

const slider = computed((): HTMLAttributes => ({
  role: 'slider',
  tabindex: 0,
  'aria-orientation': 'horizontal',
  'aria-label': texts.value.imageWidth,
  'aria-valuemin': MIN_PERCENT,
  'aria-valuemax': MAX_PERCENT,
  'aria-valuenow': widthPercent.value,
  'aria-valuetext': `${String(widthPercent.value)} %`,
}));

const pending = computed(() => uploads?.replacing.value.get(node.id));

const percent = computed(() =>
  pending.value?.status === 'uploading' ? Math.round(pending.value.progress * 100) : 0,
);

const alignItems = computed((): NuiToggleItem<NuiContentAlign>[] => [
  { value: 'start', label: texts.value.imageAlignStart, icon: 'align-start' },
  ...onlyIf<NuiToggleItem<NuiContentAlign>>(wrap.value === 'break', () => ({
    value: 'center',
    label: texts.value.imageAlignCenter,
    icon: 'align-center',
  })),
  { value: 'end', label: texts.value.imageAlignEnd, icon: 'align-end' },
]);

const wrapItems = computed((): NuiToggleItem<NuiContentWrap>[] => [
  { value: 'inline', label: texts.value.imageWrapInline, icon: 'wrap-inline' },
  { value: 'wrap', label: texts.value.imageWrapWrap, icon: 'wrap-text' },
  { value: 'break', label: texts.value.imageWrapBreak, icon: 'wrap-break' },
]);

const rtl = (): boolean => getComputedStyle(element).direction === 'rtl';

const BAR_MARGIN = 64;

const fitBar = (): void => {
  const width = bar.value?.offsetWidth ?? 0;

  roomy.value = width === 0 || (frame.value?.clientWidth ?? 0) >= width + BAR_MARGIN;
};

const measure = (): void => {
  const natural = picture.value?.naturalWidth ?? 0;

  measured.value = natural > 0 ? clampShare(natural / lineWidthOf(element)) : 1;
  captionView.value?.fit();
  fitBar();
};

const setWidth = (next: number): void => {
  editor.setAttrs({ width: clampShare(next) });
};

const setWrap = (value: NuiContentWrap | null): void => {
  if (value !== null) {
    editor.setAttrs(
      value === 'wrap' && align.value === 'center'
        ? { wrap: value, align: 'start' }
        : { wrap: value },
    );
  }
};

const setAlign = (value: NuiContentAlign | null): void => {
  if (value !== null) {
    editor.setAttrs({ align: value });
  }
};

const onGripDown = ({ side, lift }: Grip, event: PointerEvent): void => {
  const grip = event.currentTarget;

  if (event.button !== 0 || !(grip instanceof HTMLElement)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  grip.setPointerCapture(event.pointerId);

  const line = lineWidthOf(element);
  const start = share.value * line;
  const before = element.style.getPropertyValue('inline-size');
  const pull = { sign: (side === 'end') === rtl() ? -1 : 1, lift, ratio: aspectOf(picture.value) };
  const symmetric = centred.value;
  let next: number | undefined;

  resizing.value = true;

  const move = (moved: PointerEvent): void => {
    const pulled = pullOf(pull, moved.clientX - event.clientX, moved.clientY - event.clientY);

    next = draggedShare(start, pulled, line, symmetric);

    editor.setStyle('inline-size', `${String(next * 100)}%`);
  };

  const finish = (): void => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', commit);
    grip.removeEventListener('pointercancel', cancel);
    resizing.value = false;
  };

  const commit = (): void => {
    finish();
    if (next !== undefined) {
      setWidth(next);
    }
  };

  const cancel = (): void => {
    finish();
    editor.setStyle('inline-size', before === '' ? null : before);
  };

  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', commit);
  grip.addEventListener('pointercancel', cancel);
};

const keyStep = (event: KeyboardEvent): number | undefined => {
  const forward = rtl() ? 'ArrowLeft' : 'ArrowRight';
  const backward = rtl() ? 'ArrowRight' : 'ArrowLeft';

  switch (event.key) {
    case forward:
    case 'ArrowUp':
      return WIDTH_STEP;
    case backward:
    case 'ArrowDown':
      return -WIDTH_STEP;
    case 'PageUp':
      return WIDE_STEP;
    case 'PageDown':
      return -WIDE_STEP;
    case 'Home':
      return -1;
    case 'End':
      return 1;
    default:
      return undefined;
  }
};

const onGripKeydown = (event: KeyboardEvent): void => {
  const step = keyStep(event);

  if (step !== undefined) {
    event.preventDefault();
    setWidth(share.value + step);
  }
};

const choose = (): void => {
  picker.value?.click();
};

const actionAttrs = (action: ImageAction): Record<string, string | undefined> =>
  action.href === undefined
    ? { 'aria-expanded': action.key === 'alt' ? String(describing.value) : undefined }
    : { href: action.href, download: '', target: '_blank', rel: 'noopener' };

const actions = computed((): readonly ImageAction[] => [
  ...onlyIf<ImageAction>(
    uploads?.enabled.value === true && uploads.images.value !== undefined,
    () => ({
      key: 'replace',
      icon: 'image-up',
      label: texts.value.imageReplace,
      run: choose,
    }),
  ),
  { key: 'download', icon: 'download', label: texts.value.download, href: src.value },
  {
    key: 'alt',
    icon: 'captions',
    label: texts.value.imageAlt,
    run: () => {
      describing.value = !describing.value;
    },
  },
]);

const onPick = (): void => {
  const file = picker.value?.files?.[0];

  if (picker.value !== null) {
    picker.value.value = '';
  }
  if (file !== undefined) {
    uploads?.replace(node.id, file);
  }
};

watch(describing, (value) => {
  if (value) {
    altDraft.value = alt.value;
  }
});

const saveAlt = (): void => {
  describing.value = false;
  editor.setAttrs({ alt: altDraft.value.trim() });
  editor.focus();
};

watch(
  () => selected,
  (value) => {
    tooled.value ||= value;
  },
);

useResizeObserver(
  () => element,
  () => {
    measure();
  },
);
</script>
