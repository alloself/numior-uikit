<template>
  <SetupProbe v-if="layer" :layers="inner" :run="run" />
  <i v-else />
</template>

<script setup lang="ts">
const { layers, run } = defineProps<{
  layers: readonly (() => void)[];
  run: () => void;
}>();

const [layer, ...inner] = layers;

if (layer) {
  layer();
} else {
  run();
}
</script>
