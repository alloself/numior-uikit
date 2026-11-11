<template>
  <NuiPopover v-model:open="open" placement="bottom-start" padding="sm" size="auto">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral" size="sm">
        <span class="nui-spreadsheet-swatches__current" :style="currentStyle" aria-hidden="true">
        </span>
        {{ label }}
      </NuiButton>
    </template>
    <div class="nui-spreadsheet-swatches">
      <NuiButton
        v-for="none in noneChoices"
        :key="none"
        variant="ghost"
        tone="neutral"
        size="xs"
        :aria-pressed="model === undefined"
        @click="choose(undefined)"
      >
        {{ texts.noColor }}
      </NuiButton>
      <div
        ref="grid"
        class="nui-spreadsheet-swatches__grid"
        role="radiogroup"
        :aria-label="label"
        @keydown="onKeydown"
      >
        <button
          v-for="(swatch, at) in swatches"
          :key="swatch.key"
          type="button"
          role="radio"
          class="nui-spreadsheet-swatches__swatch"
          :class="{ 'nui-spreadsheet-swatches__swatch--chosen': swatch.key === chosenKey }"
          :style="{ background: swatch.css }"
          :aria-checked="swatch.key === chosenKey"
          :aria-label="swatch.label"
          :tabindex="at === focusIndex ? 0 : -1"
          @click="choose(swatch.color)"
        ></button>
      </div>
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import { Key } from '@numior/primitives';
import { NuiButton, NuiPopover } from '@numior/vue';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { colorHex, type ThemePalette } from '../../core';
import { StyleColorKind } from '../../core/cell.types';
import type { StyleColor } from '../../core/decorations';
import type { NuiSpreadsheetRuleEditorMessages } from './rule-editor.messages';
import type { RuleSwatch, SheetSwatchesProps } from './rules.types';

const SLOTS = 10;

const TINTS = [0, 0.8, 0.6, 0.4, -0.25, -0.5];

const keyOf = (color: StyleColor | undefined): string => {
  switch (color?.kind) {
    case StyleColorKind.Theme:
      return `theme:${String(color.theme)}:${String(color.tint)}`;
    case StyleColorKind.Rgb:
      return `rgb:${color.argb.slice(-6).toUpperCase()}`;
    default:
      return '';
  }
};

const swatchesOf = (theme: ThemePalette, texts: NuiSpreadsheetRuleEditorMessages): RuleSwatch[] =>
  TINTS.flatMap((tint) =>
    Array.from({ length: SLOTS }, (_, slot): RuleSwatch => {
      const color: StyleColor = { kind: StyleColorKind.Theme, theme: slot, tint };

      return {
        key: keyOf(color),
        color,
        css: `#${colorHex(color, theme) ?? 'FFFFFF'}`,
        label: texts.swatch({ slot, tint }),
      };
    }),
  );

const { theme, label, texts, clearable = false } = defineProps<SheetSwatchesProps>();

const model = defineModel<StyleColor | undefined>();

const grid = useTemplateRef<HTMLElement>('grid');

const open = ref(false);

const swatches = computed(() => swatchesOf(theme, texts));

const chosenKey = computed(() => keyOf(model.value));

const noneChoices = computed(() => (clearable ? ['none'] : []));

const focusIndex = ref(0);

const currentStyle = computed(() => {
  const hex = colorHex(model.value, theme);

  return hex === undefined ? {} : { background: `#${hex}` };
});

const choose = (color: StyleColor | undefined): void => {
  model.value = color;
  open.value = false;
};

const STEPS: Readonly<Record<string, number>> = {
  [Key.ArrowRight]: 1,
  [Key.ArrowLeft]: -1,
  [Key.ArrowDown]: SLOTS,
  [Key.ArrowUp]: -SLOTS,
};

const focusSwatch = (index: number): void => {
  focusIndex.value = index;

  void nextTick(() => {
    const target = grid.value?.children[index];

    if (!(target instanceof HTMLElement)) {
      return;
    }

    target.focus();
  });
};

const onKeydown = (event: KeyboardEvent): void => {
  const step = STEPS[event.key];

  if (step === undefined) {
    return;
  }
  event.preventDefault();
  focusSwatch(Math.max(0, Math.min(swatches.value.length - 1, focusIndex.value + step)));
};

watch(open, (next) => {
  if (!next) {
    return;
  }

  const at = swatches.value.findIndex((swatch) => swatch.key === chosenKey.value);

  focusSwatch(Math.max(at, 0));
});
</script>
