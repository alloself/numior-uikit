<template>
  <ApiComponent
    v-for="component in components"
    :key="component.name"
    :component="component"
    :locale="locale"
    :texts="texts"
    :heading="components.length > 1"
  />
</template>

<script setup lang="ts">
import { loadComponentReference } from '../reference';
import type { ApiReferenceViewProps } from '../theme.types';
import ApiComponent from './ApiComponent.vue';

const { names, locale, texts } = defineProps<ApiReferenceViewProps>();

const components = await Promise.all(names.map((name) => loadComponentReference(name)));
</script>
