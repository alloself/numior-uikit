<template>
  <span>
    <template v-for="(segment, index) in segments" :key="index">
      <code v-if="segment.code">{{ segment.text }}</code>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { inlineSegments } from '../inline-code';
import type { InlineTextProps } from '../theme.types';

const { text } = defineProps<InlineTextProps>();

const segments = computed(() => inlineSegments(text));
</script>
