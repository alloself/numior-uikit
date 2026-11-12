<template>
  <component :is="example.component" />
</template>

<script setup lang="ts">
import { blockExampleOf } from '../../blocks';
import { loadExample } from '../examples';
import type { BlockStageProps } from '../theme.types';

const { name, locale } = defineProps<BlockStageProps>();

const example = await loadExample(locale, blockExampleOf(name));
</script>
