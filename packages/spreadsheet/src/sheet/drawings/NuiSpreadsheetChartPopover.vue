<template>
  <NuiPopover
    :open="settings.popover.open.value"
    :anchor="settings.popover.anchor.value"
    :placement="settings.placement.value"
    size="auto"
    padding="none"
    fit
    role="dialog"
    :aria-labelledby="settings.popover.titleId"
    @update:open="settings.popover.setOpen"
    @toggle="settings.popover.onToggle"
  >
    <NuiSpreadsheetChartSettings
      v-if="settings.popover.shown.value && settings.chart.value !== undefined"
      ref="panel"
      :chart="settings.chart.value"
      :title-id="settings.popover.titleId"
      :texts="texts"
      @change="settings.change"
      @close="settings.popover.hide"
    />
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiPopover } from '@numior/vue';
import { useTemplateRef } from 'vue';
import NuiSpreadsheetChartSettings from './NuiSpreadsheetChartSettings.vue';
import type { ChartSettingsPopoverProps } from './drawings.types';

const { settings, texts } = defineProps<ChartSettingsPopoverProps>();

const panel = useTemplateRef<{ focusStart(): void }>('panel');

const focusStart = (): void => {
  panel.value?.focusStart();
};

defineExpose({ focusStart });
</script>
