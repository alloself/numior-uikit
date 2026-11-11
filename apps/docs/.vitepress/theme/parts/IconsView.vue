<template>
  <IconTable :icons="icons" :texts="texts" />
</template>

<script setup lang="ts">
import { loadIconReference } from '../reference';
import type { DocsTexts } from '../theme.types';
import IconTable from './IconTable.vue';

interface Props {
  texts: DocsTexts;
}

const { texts } = defineProps<Props>();

const icons = await loadIconReference();
</script>
