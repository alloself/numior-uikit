<template>
  <div class="max-w-3xl mx-auto p-6 mt-8">
    <NuiEmpty :title="texts.notFoundTitle" :description="texts.notFoundText" icon="search">
      <template #actions>
        <NuiButton :href="localeBase" variant="outline" tone="neutral">{{ texts.home }}</NuiButton>
      </template>
    </NuiEmpty>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiEmpty } from '@numior/vue';
import { useDocs } from '../composables/use-docs';

const { texts, localeBase } = useDocs();
</script>
