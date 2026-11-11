<template>
  <span class="flex min-w-0 flex-col gap-0.5">
    <span>{{ label }}</span>
    <span v-if="parts.length > 0" class="line-clamp-2 text-xs text-muted-foreground">
      <template v-for="(part, index) in parts" :key="index">
        <mark v-if="part.hit" class="bg-transparent font-semibold text-foreground">{{
          part.text
        }}</mark>
        <template v-else>{{ part.text }}</template>
      </template>
    </span>
  </span>
</template>

<script setup lang="ts">
import type { SnippetPart } from '../search-index';

const { label, parts = [] } = defineProps<{
  label: string;
  parts?: readonly SnippetPart[] | undefined;
}>();
</script>
