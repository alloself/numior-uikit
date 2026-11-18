<template>
  <HomeScreen :screen="example.component" :texts="texts" />
</template>

<script setup lang="ts">
import { loadExample } from '../examples';
import type { HomeScreenViewProps } from '../theme.types';
import HomeScreen from './HomeScreen.vue';

const { name, locale, texts } = defineProps<HomeScreenViewProps>();

const example = await loadExample(locale, name);
</script>
