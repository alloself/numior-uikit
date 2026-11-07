<template>
  <NuiRadioGroup
    :model-value="form.preset"
    :options="presets"
    :label="texts.look"
    size="sm"
    @update:model-value="setPreset"
  >
    <template #option="{ option }">
      <span class="nui-spreadsheet-rules__preset">
        <span
          class="nui-spreadsheet-rules__preview"
          :style="previewOf(option.value)"
          aria-hidden="true"
          >{{ ruleTexts.sample }}</span
        >
        <span>{{ option.label }}</span>
      </span>
    </template>
  </NuiRadioGroup>
  <div v-if="form.preset === CUSTOM_PRESET" class="nui-spreadsheet-rules__custom">
    <NuiToggleGroup
      :values="fontValues"
      :items="fontItems"
      :label="texts.look"
      multiple
      icon-only
      size="sm"
      @update:values="setFont"
    />
    <NuiSpreadsheetSwatches
      :model-value="form.custom.color"
      :theme="looks.theme"
      :label="texts.textColor"
      :texts="texts"
      clearable
      @update:model-value="setCustom('color', $event)"
    />
    <NuiSpreadsheetSwatches
      :model-value="form.custom.fill"
      :theme="looks.theme"
      :label="texts.fillColor"
      :texts="texts"
      clearable
      @update:model-value="setCustom('fill', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { Bold, Italic, Strikethrough } from '@lucide/vue';
import { useMessages } from '@numior/primitives';
import { NuiRadioGroup, NuiToggleGroup, type NuiOption, type NuiToggleItem } from '@numior/vue';
import { computed, markRaw } from 'vue';
import { CONDITIONAL_PRESETS } from '../../core';
import NuiSpreadsheetSwatches from './NuiSpreadsheetSwatches.vue';
import { formStyle } from './rule-form';
import { stylePreview } from './rule-preview';
import { spreadsheetRulesMessages } from './rules.messages';
import {
  CUSTOM_PRESET,
  FontMark,
  type CustomLook,
  type RuleEditorPartProps,
  type RuleForm,
} from './rules.types';

const ICONS = { bold: markRaw(Bold), italic: markRaw(Italic), strike: markRaw(Strikethrough) };

const { texts, looks } = defineProps<RuleEditorPartProps>();

const form = defineModel<RuleForm>('form', { required: true });

const ruleTexts = useMessages(spreadsheetRulesMessages);

const presets = computed((): NuiOption<string>[] =>
  [...CONDITIONAL_PRESETS.map((preset) => preset.key), CUSTOM_PRESET].map((preset) => ({
    value: preset,
    label: texts.preset({ preset }),
  })),
);

const previewOf = (preset: string): Readonly<Record<string, string>> =>
  stylePreview(formStyle({ ...form.value, preset }), looks).style;

const fontItems = computed((): NuiToggleItem<FontMark>[] =>
  Object.values(FontMark).map((mark) => ({ value: mark, label: texts[mark], icon: ICONS[mark] })),
);

const fontValues = computed((): FontMark[] =>
  Object.values(FontMark).filter((mark) => form.value.custom[mark]),
);

const setPreset = (preset: string): void => {
  form.value = { ...form.value, preset };
};

const setCustom = <K extends keyof CustomLook>(key: K, value: CustomLook[K]): void => {
  form.value = { ...form.value, custom: { ...form.value.custom, [key]: value } };
};

const setFont = (marks: FontMark[]): void => {
  form.value = {
    ...form.value,
    custom: {
      ...form.value.custom,
      bold: marks.includes(FontMark.Bold),
      italic: marks.includes(FontMark.Italic),
      strike: marks.includes(FontMark.Strike),
    },
  };
};
</script>
