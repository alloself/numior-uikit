<template>
  <ApiKeyboard :keys="component.keyboard" :locale="locale" :texts="texts" />
</template>

<script setup lang="ts">
import { loadComponentReference } from '../reference';
import type { KeyboardViewProps } from '../theme.types';
import ApiKeyboard from './ApiKeyboard.vue';

const { name, locale, texts } = defineProps<KeyboardViewProps>();

const component = await loadComponentReference(name);
</script>
