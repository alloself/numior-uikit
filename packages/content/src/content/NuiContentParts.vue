<template>
  <template v-for="(part, index) in parts" :key="index">
    <component :is="part" v-if="isVNode(part)" />
    <template v-else>{{ part }}</template>
  </template>
</template>

<script setup lang="ts">
import { isVNode } from 'vue';
import type { ContentPart } from './content-parts';

const { parts } = defineProps<{
  parts: readonly ContentPart[];
}>();
</script>
