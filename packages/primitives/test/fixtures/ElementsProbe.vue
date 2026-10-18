<template>
  <component :is="tags[0]" ref="first" />
  <component :is="tags[1]" ref="second" />
</template>

<script setup lang="ts">
import { shallowRef, type Ref } from 'vue';

const { tags, run } = defineProps<{
  tags: readonly [string, string];
  run: (first: Ref<HTMLElement | null>, second: Ref<HTMLElement | null>) => void;
}>();

const first = shallowRef<HTMLElement | null>(null);
const second = shallowRef<HTMLElement | null>(null);

run(first, second);
</script>
