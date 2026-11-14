<template>
  <div
    class="root"
    @pointerdown.capture="targets.onPointerdown"
    @pointerdown="emit('press', 'root')"
  >
    <div ref="outer" class="outer">
      <span v-if="shown" ref="inner" class="inner"><b class="mark">1</b></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { createPressTargets, usePressTarget } from '../../src';

const { shown, stops } = defineProps<{ shown: boolean; stops: boolean }>();

const emit = defineEmits<{
  press: [part: string];
}>();

const targets = createPressTargets();

usePressTarget(targets, useTemplateRef('outer'), () => {
  emit('press', 'outer');
});

usePressTarget(targets, useTemplateRef('inner'), (event) => {
  emit('press', 'inner');

  if (!stops) {
    return;
  }

  event.stopPropagation();
});
</script>
