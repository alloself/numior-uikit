<template>
  <div
    class="nui-editor-image"
    :class="{
      'nui-editor-image--selected': selected,
      'nui-editor-image--resizing': resizing,
      'nui-editor-image--captioned': captionDraft !== '',
    }"
  >
    <div class="nui-editor-image__frame">
      <img class="nui-content__picture" :src="src" :alt="alt" draggable="false" />
      <div v-if="pending !== undefined" class="nui-editor-image__busy">
        <NuiProgress
          class="nui-editor-image__progress"
          size="sm"
          :value="percent"
          :label="texts.uploading({ percent })"
        />
      </div>
      <template v-if="editable">
        <span
          v-for="side in SIDES"
          :key="side"
          class="nui-editor-image__grip"
          :class="`nui-editor-image__grip--side-${side}`"
          role="slider"
          tabindex="0"
          aria-orientation="horizontal"
          :aria-label="texts.imageWidth"
          :aria-valuemin="MIN_PERCENT"
          :aria-valuemax="MAX_PERCENT"
          :aria-valuenow="widthPercent"
          :aria-valuetext="`${String(widthPercent)} %`"
          @pointerdown="onGripDown(side, $event)"
          @keydown="onGripKeydown"
        />
        <div v-if="selected" class="nui-editor-image__bar" role="toolbar" :aria-label="texts.image">
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
            v-if="uploads?.enabled.value"
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
            :aria-label="texts.download"
          />
          <NuiPopover
            v-model:open="describing"
            placement="bottom-end"
            padding="sm"
            @toggle="onAltToggle"
          >
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
            <form ref="altForm" class="nui-editor-image__alt" @submit.prevent="saveAlt">
              <NuiField :label="texts.imageAlt" :description="texts.imageAltHint">
                <NuiInput v-model="altDraft" size="sm" />
              </NuiField>
              <NuiButton type="submit" size="sm">{{ texts.imageAltSave }}</NuiButton>
            </form>
          </NuiPopover>
          <input
            ref="picker"
            class="nui-editor-image__picker"
            type="file"
            accept="image/*"
            tabindex="-1"
            aria-hidden="true"
            @change="onPick"
          />
        </div>
      </template>
    </div>
    <textarea
      v-if="editable"
      ref="captionField"
      class="nui-content__caption nui-editor-image__caption"
      rows="1"
      :value="captionDraft"
      :placeholder="texts.imageCaption"
      :aria-label="texts.imageCaption"
      @input="onCaptionInput"
      @change="commitCaption"
      @keydown="onCaptionKeydown"
    />
    <span v-else-if="caption !== ''" class="nui-content__caption">{{ caption }}</span>
  </div>
</template>

<script setup lang="ts">
import { nodeSize, textSelection, type Command } from '@numior/editor-core';
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
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import { useEditorUploadContext } from '../../uploads/uploads-context';
import type { NuiEditorBlockViewProps } from '../block.types';
import {
  WIDE_STEP,
  WIDTH_STEP,
  alignOf,
  clampShare,
  draggedShare,
  lineWidthOf,
  previewWidth,
} from './image-size';

type GripSide = 'start' | 'end';

const SIDES: readonly GripSide[] = ['start', 'end'];

const MIN_PERCENT = 20;

const MAX_PERCENT = 100;

const { node, element, selected, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);
const uploads = useEditorUploadContext();
const picker = useTemplateRef<HTMLInputElement>('picker');
const altForm = useTemplateRef<HTMLElement>('altForm');
const captionField = useTemplateRef<HTMLTextAreaElement>('captionField');
const resizing = ref(false);
const describing = ref(false);
const altDraft = ref('');
const measured = ref(1);

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const src = computed(() => textOf(node.attrs.src));
const alt = computed(() => textOf(node.attrs.alt));
const caption = computed(() => textOf(node.attrs.caption));
const align = computed(() => alignOf(node.attrs.align));
const captionDraft = ref(caption.value);

const share = computed(() =>
  typeof node.attrs.width === 'number' ? node.attrs.width : measured.value,
);

const widthPercent = computed(() => Math.round(share.value * 100));

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

const fitCaption = (): void => {
  const field = captionField.value;

  if (field !== null) {
    field.style.blockSize = 'auto';
    field.style.blockSize = `${String(field.scrollHeight)}px`;
  }
};

const measure = (): void => {
  measured.value = clampShare(element.getBoundingClientRect().width / lineWidthOf(element));
  fitCaption();
};

const setWidth = (next: number): void => {
  editor.setAttrs({ width: clampShare(next) });
};

const setAlign = (value: NuiContentAlign | null): void => {
  if (value !== null) {
    editor.setAttrs({ align: value });
  }
};

const onGripDown = (side: GripSide, event: PointerEvent): void => {
  const grip = event.currentTarget;

  if (event.button !== 0 || !(grip instanceof HTMLElement)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  grip.setPointerCapture(event.pointerId);

  const line = lineWidthOf(element);
  const start = element.getBoundingClientRect().width;
  const sign = (side === 'end') === rtl() ? -1 : 1;
  const symmetric = align.value === 'center';
  let next: number | undefined;

  resizing.value = true;

  const move = (moved: PointerEvent): void => {
    next = draggedShare(start, (moved.clientX - event.clientX) * sign, line, symmetric);
    previewWidth(element, next);
  };

  const end = (): void => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', end);
    grip.removeEventListener('pointercancel', end);
    resizing.value = false;
    if (next !== undefined) {
      setWidth(next);
    }
  };

  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
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

const onAltToggle = (event: Event): void => {
  if ('newState' in event && event.newState === 'open') {
    altDraft.value = alt.value;
    altForm.value?.querySelector('input')?.focus();
  }
};

const saveAlt = (): void => {
  describing.value = false;
  editor.setAttrs({ alt: altDraft.value.trim() });
  editor.focus();
};

const onCaptionInput = (event: Event): void => {
  if (event.target instanceof HTMLTextAreaElement) {
    captionDraft.value = event.target.value;
  }
  fitCaption();
};

const commitCaption = (): void => {
  if (captionDraft.value.trim() !== caption.value) {
    editor.setAttrs({ caption: captionDraft.value.trim() });
  }
};

const paragraphAfter: Command = (state, dispatch) => {
  const from = state.doc.positionOf(node.id);
  const current = state.doc.byId(node.id);

  if (from === undefined || current === undefined || !state.doc.schema.nodes.has('paragraph')) {
    return false;
  }
  const at = from + nodeSize(current);
  const tr = state.tr;

  tr.insert(at, [state.doc.schema.element('paragraph', { id: tr.newId() })]);
  tr.setSelection(textSelection(at + 1));
  dispatch?.(tr);
  return true;
};

const onCaptionKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault();
    commitCaption();
    editor.run(paragraphAfter);
    editor.focus();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    captionDraft.value = caption.value;
    editor.focus();
  }
};

watch(caption, (value) => {
  captionDraft.value = value;
});

watch(captionDraft, fitCaption, { flush: 'post' });

onMounted(fitCaption);

useResizeObserver(
  () => element,
  () => {
    measure();
  },
);
</script>
