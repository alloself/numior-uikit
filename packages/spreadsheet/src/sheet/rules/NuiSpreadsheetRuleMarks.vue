<template>
  <div v-if="form.kind === RuleFormKind.IconSet" class="nui-spreadsheet-rules__fields">
    <NuiSelect
      :model-value="form.iconSet"
      :options="iconSets"
      :label="texts.icons"
      size="sm"
      @update:model-value="setSet"
    />
    <span class="nui-spreadsheet-rules__glyphs" aria-hidden="true">
      <span
        v-for="(icon, at) in shownIcons"
        :key="at"
        class="nui-spreadsheet-rules__glyph"
        :style="{ color: icon.color }"
      >
        <NuiIcon :icon="icon.icon" :filled="icon.filled" />
      </span>
    </span>
  </div>
  <div v-else class="nui-spreadsheet-rules__stops">
    <NuiSpreadsheetSwatches
      v-for="(color, at) in form.colors"
      :key="at"
      :model-value="color"
      :theme="looks.theme"
      :label="stopLabels[at] ?? ''"
      :texts="texts"
      @update:model-value="setColor(at, $event)"
    />
  </div>
  <NuiCheckbox
    v-for="field in valueFields"
    :key="field"
    :model-value="form.showValue"
    :label="texts.showValue"
    size="sm"
    @update:model-value="setShown"
  />
</template>

<script setup lang="ts">
import { NuiCheckbox, NuiIcon, NuiSelect, type NuiOption } from '@numior/vue';
import { computed } from 'vue';
import type { StyleColor } from '../../core/decorations';
import { SHEET_ICON_SETS, sheetIcons } from '../sheet-icons';
import NuiSpreadsheetSwatches from './NuiSpreadsheetSwatches.vue';
import { RuleFormKind, type RuleEditorPartProps, type RuleForm } from './rules.types';

const { texts, looks } = defineProps<RuleEditorPartProps>();

const form = defineModel<RuleForm>('form', { required: true });

const iconSets = computed((): NuiOption<string>[] =>
  SHEET_ICON_SETS.map((set) => ({
    value: set,
    label: texts.iconSetName({ set }),
    icon: sheetIcons(set).at(-1)?.icon,
  })),
);

const shownIcons = computed(() => sheetIcons(form.value.iconSet));

const stopLabels = computed((): readonly string[] =>
  form.value.kind === RuleFormKind.DataBar
    ? [texts.barColor]
    : texts.stops({ count: form.value.colors.length }),
);

const valueFields = computed((): string[] =>
  form.value.kind === RuleFormKind.DataBar || form.value.kind === RuleFormKind.IconSet
    ? ['showValue']
    : [],
);

const setSet = (set: string | null): void => {
  if (set === null) {
    return;
  }

  form.value = { ...form.value, iconSet: set };
};

const setColor = (at: number, color: StyleColor | undefined): void => {
  if (color === undefined) {
    return;
  }

  form.value = {
    ...form.value,
    colors: form.value.colors.map((each, index) => (index === at ? color : each)),
  };
};

const setShown = (showValue: boolean): void => {
  form.value = { ...form.value, showValue };
};
</script>
