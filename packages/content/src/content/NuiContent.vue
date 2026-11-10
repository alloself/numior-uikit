<template>
  <div class="nui-content" :class="`nui-content--size-${size}`">
    <ContentNodes
      v-if="read.ok"
      :root="read.doc.root"
      :schema="read.doc.schema"
      :views="views ?? NO_VIEWS"
    />
  </div>
</template>

<script setup lang="ts">
import { fromJSON, type DocJSONIssue, type DocJSONResult } from '@numior/editor-core';
import { computed, watch } from 'vue';
import { ContentNodes } from './content-nodes';
import { contentSchema } from './content-schema';
import type { NuiContentProps, NuiContentViews } from './content.types';
import { provideAllowedEmbeds } from './embed-context';
import { embedProviders, type NuiEmbedProvider } from './embeds';

const NO_VIEWS: NuiContentViews = {};

const NO_EMBEDS: readonly NuiEmbedProvider[] = [];

const {
  document,
  schema = contentSchema,
  size = 'md',
  views,
  embeds,
} = defineProps<NuiContentProps>();

const emit = defineEmits<{
  invalid: [issues: readonly DocJSONIssue[]];
}>();

const read = computed<DocJSONResult>(() =>
  'format' in document ? fromJSON(schema, document) : { ok: true, doc: document },
);

const providers = computed(() => embedProviders(embeds ?? NO_EMBEDS));

provideAllowedEmbeds(() => providers.value);

watch(
  read,
  (result) => {
    if (!result.ok) {
      emit('invalid', result.issues);
    }
  },
  { immediate: true },
);
</script>
