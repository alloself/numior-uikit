<template>
  <BlockFrame
    :name="name"
    :src="withBase(blockRouteOf(name, locale))"
    :height="blockHeightOf(name)"
    :files="example.files"
    :texts="texts"
  />
</template>

<script setup lang="ts">
import { withBase } from 'vitepress';
import { blockExampleOf, blockHeightOf, blockRouteOf } from '../../blocks';
import { loadExample } from '../examples';
import type { ExampleViewProps } from '../theme.types';
import BlockFrame from './BlockFrame.vue';

const { name, locale, texts } = defineProps<ExampleViewProps>();

const example = await loadExample(locale, blockExampleOf(name));
</script>
