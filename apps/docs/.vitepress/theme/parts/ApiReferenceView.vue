<template>
  <ApiComponent
    v-for="entry in entries"
    :key="entry.component.name"
    :component="entry.component"
    :catalog="entry.catalog"
    :locale="locale"
    :texts="texts"
    :heading="entries.length > 1"
  />
</template>

<script setup lang="ts">
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

const shownStyles = new Set<string>();

const entries = loaded.map((entry) => {
  const styles = entry.component.styles;

  if (styles === undefined || shownStyles.has(styles.import)) {
    return { ...entry, component: { ...entry.component, styles: undefined } };
  }
  shownStyles.add(styles.import);
  return entry;
});
</script>
