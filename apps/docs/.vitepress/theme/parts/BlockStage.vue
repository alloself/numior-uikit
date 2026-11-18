<template>
  <div v-if="isFramedExample(name)" class="flex justify-center p-8">
    <component :is="example.component" />
  </div>
  <component :is="example.component" v-else />
</template>

<script setup lang="ts">
import { blockExampleOf, isFramedExample } from '../../blocks';
import { loadExample } from '../examples';
import type { BlockStageProps } from '../theme.types';

const { name, locale } = defineProps<BlockStageProps>();

const example = await loadExample(locale, blockExampleOf(name));
</script>
