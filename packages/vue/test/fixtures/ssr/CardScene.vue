<template>
  <NuiCard href="/plans" title="Plans" description="Pick one">
    <NuiCardMedia src="/cover.png" alt="Cover" />
    <NuiCardContent v-if="body">{{ body }}</NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { NuiCard, NuiCardContent, NuiCardMedia } from '../../../src';

const { body } = defineProps<{ body?: string | undefined }>();
</script>
