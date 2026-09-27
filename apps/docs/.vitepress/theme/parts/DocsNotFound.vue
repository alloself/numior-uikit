<template>
  <div class="nui-max-w-3xl nui-mx-auto nui-p-6 nui-mt-8">
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
