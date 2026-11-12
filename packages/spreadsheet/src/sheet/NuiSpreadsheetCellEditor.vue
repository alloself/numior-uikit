<template>
  <span class="nui-spreadsheet__editor" :class="{ 'nui-spreadsheet__editor--painted': painted }">
    <span ref="mirror" class="nui-spreadsheet__editor-mirror" dir="auto" aria-hidden="true">
      <span v-if="painted" class="nui-spreadsheet__editor-text">
        <span
          v-for="segment in shown"
          :key="segment.key"
          :class="
            segment.tone === undefined
              ? undefined
              : ['nui-spreadsheet__token', `nui-spreadsheet__token--tone-${segment.tone}`]
          "
          >{{ segment.text }}</span
        >
      </span>
    </span>
    <input
      ref="field"
      v-model="model"
      v-bind="$attrs"
      class="nui-spreadsheet__editor-control"
      :aria-invalid="invalid"
      dir="auto"
      autocomplete="off"
      spellcheck="false"
      @scroll="follow"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue';
import { SHEET_SEGMENTS } from './sheet-segments';
import type { FormulaSegment, SheetCellEditorProps } from './sheet.types';

defineOptions({ inheritAttrs: false });

const { invalid = false } = defineProps<SheetCellEditorProps>();

const model = defineModel<string>({ default: '' });

const segments = inject(SHEET_SEGMENTS, undefined);

const field = useTemplateRef<HTMLInputElement>('field');

const mirror = useTemplateRef<HTMLElement>('mirror');

const isToned = (segment: FormulaSegment): boolean => segment.tone !== undefined;

const shown = computed((): readonly FormulaSegment[] => {
  const parts = segments?.value ?? [];

  return parts.map((part) => part.text).join('') === model.value ? parts : [];
});

const painted = computed(() => shown.value.some(isToned));

const follow = (): void => {
  if (field.value === null || mirror.value === null) {
    return;
  }

  mirror.value.scrollLeft = field.value.scrollLeft;
};

defineExpose({
  focus: () => {
    field.value?.focus();
  },
});
</script>
