<template>
  <div
    class="nui-editor-image"
    :class="{
      'nui-editor-image--selected': selected,
      'nui-editor-image--resizing': resizing,
    }"
  >
    <div class="nui-editor-image__frame">
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
          v-bind="grip.edge === 'bottom' && grip.side === 'end' ? slider : HIDDEN_GRIP"
          @pointerdown="onGripDown(grip, $event)"
          @keydown="onGripKeydown"
        />
        <NuiPopover
          v-if="tooled"
          class="nui-editor-image__toolbar"
          :open="selected && focused && !resizing"
          :anchor="corner"
          mode="manual"
          placement="bottom-end"
          :offset="0"
          padding="sm"
        >
          <div class="nui-editor-image__bar" role="toolbar" :aria-label="texts.image">
            <NuiToggleGroup
              :model-value="align"
              :items="alignItems"
              :label="texts.imageAlign"
              size="sm"
              icon-only
              required
              @update:model-value="setAlign"
            />
            <NuiButton
              v-if="uploads?.enabled.value && uploads.images.value !== undefined"
              variant="ghost"
              tone="neutral"
              size="sm"
              icon="image-up"
              :aria-label="texts.imageReplace"
              @click="choose"
            />
            <NuiButton
              variant="ghost"
              tone="neutral"
              size="sm"
              icon="download"
              :href="src"
              download=""
              target="_blank"
              rel="noopener"
              :aria-label="texts.download"
            />
            <NuiPopover v-model:open="describing" placement="bottom-end" padding="sm">
              <template #trigger="{ attrs }">
                <NuiButton
                  v-bind="attrs"
                  variant="ghost"
                  tone="neutral"
                  size="sm"
                  icon="captions"
                  :aria-label="texts.imageAlt"
                />
              </template>
              <form class="nui-editor-image__alt" @submit.prevent="saveAlt">
                <NuiField :label="texts.imageAlt" :description="texts.imageAltHint">
                  <NuiInput v-model="altDraft" size="sm" autofocus />
                </NuiField>
                <div class="nui-editor-image__actions">
                  <NuiButton type="submit" size="sm">{{ texts.imageAltSave }}</NuiButton>
                </div>
              </form>
            </NuiPopover>
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
        </NuiPopover>
      </template>
    </div>
    <NuiEditorCaption
      ref="caption"
      :node="node"
      :editor="editor"
      :editable="editable"
      :selected="selected"
    />
  </div>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import {
  NuiButton,
  NuiField,
  NuiInput,
  NuiPopover,
  NuiProgress,
  NuiToggleGroup,
  type NuiToggleItem,
} from '@numior/vue';
import { useResizeObserver } from '@vueuse/core';
import type { NuiContentAlign } from '@numior/content';
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
} from './image-size';

type GripSide = 'start' | 'end';

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
  { value: 'center', label: texts.value.imageAlignCenter, icon: 'align-center' },
  { value: 'end', label: texts.value.imageAlignEnd, icon: 'align-end' },
]);

const rtl = (): boolean => getComputedStyle(element).direction === 'rtl';

const measure = (): void => {
  const natural = picture.value?.naturalWidth ?? 0;

  measured.value = natural > 0 ? clampShare(natural / lineWidthOf(element)) : 1;
  captionView.value?.fit();
};

const setWidth = (next: number): void => {
  editor.setAttrs({ width: clampShare(next) });
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
  const symmetric = align.value === 'center';
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
