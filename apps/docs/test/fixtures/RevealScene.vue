<template>
  <div ref="scene">
    <nav class="scroller" style="overflow-y: auto">
      <a
        v-for="link in links"
        :key="link"
        :href="link"
        :aria-current="link === current ? 'page' : undefined"
      >
        {{ link }}
      </a>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { revealCurrent } from '../../.vitepress/theme/composables/reveal-current';

interface Props {
  links: readonly string[];
  current: string;
}

const { links, current } = defineProps<Props>();

const scene = useTemplateRef<HTMLElement>('scene');

const reveal = (): void => {
  revealCurrent(scene.value);
};

defineExpose({ reveal });
</script>
