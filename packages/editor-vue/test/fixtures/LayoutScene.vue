<template>
  <div ref="frame" class="layout-scene">
    <div ref="content" class="layout-scene__content">
      <p class="layout-scene__line">Line <img class="layout-scene__picture" alt="" /></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useLayoutWatch } from '../../src/editor/use-layout-watch';

const frame = useTemplateRef<HTMLElement>('frame');
const content = useTemplateRef<HTMLElement>('content');

const layout = useLayoutWatch(frame, content);

defineExpose({ watchLayout: layout.watch });
</script>
