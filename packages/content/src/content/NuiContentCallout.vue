<template>
  <div v-bind="attributes">
    <span class="nui-content__callout-mark" aria-hidden="true"><NuiIcon :icon="tone" /></span>
    <NuiContentParts :parts="content" />
  </div>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import { computed } from 'vue';
import type { ContentPart } from './content-parts';
import { CONTENT_TONES } from './content-schema';
import { NuiContentTone } from './content.types';
import NuiContentParts from './NuiContentParts.vue';

const { value, attributes, content } = defineProps<{
  value: unknown;
  attributes: Readonly<Record<string, string>>;
  content: readonly ContentPart[];
}>();

const tone = computed(() => CONTENT_TONES.find((known) => known === value) ?? NuiContentTone.Info);
</script>
