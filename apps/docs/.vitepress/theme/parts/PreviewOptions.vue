<template>
  <NuiToggleGroup
    v-model:values="options"
    :items="items"
    :label="texts.exampleOptions"
    size="sm"
    multiple
    icon-only
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Palette } from '@lucide/vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/vue';
import { useAccent } from '../composables/use-accent';
import type { PreviewOption, PreviewOptionsProps } from '../theme.types';

const { texts } = defineProps<PreviewOptionsProps>();

const options = defineModel<PreviewOption[]>('options', { default: () => [] });

const palette = useAccent();

const items = computed<readonly NuiToggleItem<PreviewOption>[]>(() => {
  const frame: NuiToggleItem<PreviewOption>[] = [
    { value: 'dark', label: texts.invertTheme, icon: 'moon' },
    { value: 'rtl', label: texts.rtl, icon: 'direction' },
  ];

  return palette.accent.value === undefined
    ? [{ value: 'base', label: texts.baseTheme, icon: Palette }, ...frame]
    : frame;
});
</script>
