<template>
  <div :dir="dir">
    <NuiSplitter v-bind="props" v-model:ratio="ratio">
      <template #start>
        <p>Start</p>
      </template>
      <template #end>
        <p>End</p>
      </template>
    </NuiSplitter>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSplitter, type NuiSplitterProps } from '../../src';

const {
  props = {},
  initialRatio = 0.5,
  dir = 'ltr',
} = defineProps<{
  props?: NuiSplitterProps | undefined;
  initialRatio?: number | undefined;
  dir?: 'ltr' | 'rtl' | undefined;
}>();

const ratio = ref(initialRatio);

defineExpose({ ratio });
</script>
