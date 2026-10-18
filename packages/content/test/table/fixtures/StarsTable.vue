<template>
  <NuiContentTable :node="node" :cells="{ number: StarsCell }" />
</template>

<script setup lang="ts">
import type { ElementNode } from '@numior/editor-core';
import { NuiContentTable } from '../../../src/table';
import StarsCell from './StarsCell.vue';

const { node } = defineProps<{ node: ElementNode }>();
</script>
