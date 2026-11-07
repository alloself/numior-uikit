<template>
  <NuiPopover
    :open="pivots.popover.open.value"
    :anchor="pivots.popover.anchor.value"
    :placement="pivots.placement.value"
    size="auto"
    padding="none"
    fit
    role="dialog"
    :aria-labelledby="pivots.popover.titleId"
    @update:open="pivots.popover.setOpen"
    @toggle="pivots.popover.onToggle"
  >
    <NuiSpreadsheetPivot
      v-if="pivots.panel.value !== undefined"
      ref="panel"
      :title-id="pivots.popover.titleId"
      :definition="pivots.panel.value"
      :fields="pivots.fields.value"
      :items="pivots.items"
      :format="pivots.format"
      :readonly="readonly"
      @close="pivots.popover.hide"
      @change="pivots.change"
    />
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiPopover } from '@numior/vue';
import { useTemplateRef } from 'vue';
import NuiSpreadsheetPivot from './NuiSpreadsheetPivot.vue';
import type { SheetPivotPopoverProps } from './pivot-panel.types';

const { pivots, readonly } = defineProps<SheetPivotPopoverProps>();

const panel = useTemplateRef<{ focusStart(): void }>('panel');

const focusStart = (): void => {
  panel.value?.focusStart();
};

defineExpose({ focusStart });
</script>
