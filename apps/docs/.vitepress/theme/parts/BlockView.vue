<template>
  <BlockFrame
    :name="name"
    :src="withBase(blockRouteOf(name, locale))"
    :height="blockNamed(name)?.height ?? DEFAULT_HEIGHT"
    :files="example.files"
    :texts="texts"
  />
</template>

<script setup lang="ts">
import { withBase } from 'vitepress';
import { blockExampleOf, blockNamed, blockRouteOf } from '../../blocks';
import { loadExample } from '../examples';
import type { ExampleViewProps } from '../theme.types';
import BlockFrame from './BlockFrame.vue';

const DEFAULT_HEIGHT = 640;

const { name, locale, texts } = defineProps<ExampleViewProps>();

const example = await loadExample(locale, blockExampleOf(name));
</script>
