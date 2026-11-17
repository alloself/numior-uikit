<template>
  <component :is="tag" v-bind="attributes">
    <component :is="parts.lead" v-if="parts.lead">
      <span v-if="mark" :class="mark"><NuiIcon :icon="icon" /></span>
      <NuiIcon v-else :icon="icon" />
    </component>
    <NuiContentParts :parts="parts.rest" />
  </component>
</template>

<script setup lang="ts">
import type { IconAlias } from '@numior/primitives';
import { NuiIcon } from '@numior/vue';
import { computed } from 'vue';
import { splitLead, type ContentPart } from './content-parts';
import NuiContentParts from './NuiContentParts.vue';

const { tag, attributes, content, icon, mark } = defineProps<{
  tag: string;
  attributes: Readonly<Record<string, string>>;
  content: readonly ContentPart[];
  icon: IconAlias;
  mark?: string;
}>();

const parts = computed(() => splitLead(content));
</script>
