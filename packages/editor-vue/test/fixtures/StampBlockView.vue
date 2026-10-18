<template>
  <span>{{ `stamp ${String(node.attrs.label)}` }}</span>
</template>

<script setup lang="ts">
import type { ElementNode } from '@numior/editor-core';

const { node } = defineProps<{ node: ElementNode }>();
</script>
