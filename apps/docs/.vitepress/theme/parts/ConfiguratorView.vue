<template>
  <ConfiguratorFrame :component="component" :locale="locale" :texts="texts" :scene="scene" />
</template>

<script setup lang="ts">
import { loadExample } from '../examples';
import { loadComponentReference } from '../reference';
import type { ConfiguratorViewProps } from '../theme.types';
import ConfiguratorFrame from './ConfiguratorFrame.vue';

const { name, locale, texts } = defineProps<ConfiguratorViewProps>();

const component = await loadComponentReference(name);
const sceneName = component.configurator?.scene;
const scene = sceneName === undefined ? undefined : await loadExample(locale, sceneName);
</script>
