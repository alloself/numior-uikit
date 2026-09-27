<template>
  <ConfiguratorFrame :component="component" :locale="locale" :texts="texts" />
</template>

<script setup lang="ts">
import { loadComponentReference } from '../reference';
import type { ConfiguratorViewProps } from '../theme.types';
import ConfiguratorFrame from './ConfiguratorFrame.vue';

const { name, locale, texts } = defineProps<ConfiguratorViewProps>();

const component = await loadComponentReference(name);
</script>
