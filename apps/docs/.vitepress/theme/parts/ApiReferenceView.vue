<template>
  <div class="mb-8">
    <ApiComponent
      v-for="entry in entries"
      :key="entry.component.name"
      :component="entry.component"
      :catalog="entry.catalog"
      :locale="locale"
      :texts="texts"
      :heading="entries.length > 1"
    />
  </div>
</template>

<script setup lang="ts">
import { withoutRepeats } from '../api-entries';
import { loadCatalogReference, loadComponentReference } from '../reference';
import type { ApiReferenceViewProps } from '../theme.types';
import ApiComponent from './ApiComponent.vue';

const { names, locale, texts } = defineProps<ApiReferenceViewProps>();

const loaded = await Promise.all(
  names.map(async (name) => {
    const component = await loadComponentReference(name);

    return {
      component,
      catalog:
        component.messages === undefined
          ? undefined
          : await loadCatalogReference(component.messages),
    };
  }),
);

const entries = withoutRepeats(loaded);
</script>
