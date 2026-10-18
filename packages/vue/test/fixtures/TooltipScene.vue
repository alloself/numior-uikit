<template>
  <div>
    <input class="outside" />
    <NuiTooltip v-bind="props" v-model:open="open" :anchor="anchor ?? undefined">
      <template v-if="!anchor" #trigger="{ attrs }">
        <button v-bind="attrs">Save</button>
      </template>
      Saves the document
    </NuiTooltip>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTooltip, type NuiTooltipProps } from '../../src';

const { props = {}, anchor = null } = defineProps<{
  props?: NuiTooltipProps | undefined;
  anchor?: HTMLButtonElement | null | undefined;
}>();

const open = ref(false);

defineExpose({ open });
</script>
