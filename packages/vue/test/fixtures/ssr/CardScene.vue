<template>
  <NuiCard href="/plans" title="Plans" description="Pick one" :loading="loading">
    <NuiCardMedia src="/cover.png" alt="Cover" />
    <NuiCardContent v-if="body">{{ body }}</NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { NuiCard, NuiCardContent, NuiCardMedia } from '../../../src';

const { body, loading = false } = defineProps<{
  body?: string | undefined;
  loading?: boolean | undefined;
}>();
</script>
