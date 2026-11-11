<template>
  <Suspense>
    <TokensView :section="section" :texts="texts" />
  </Suspense>
</template>

<script setup lang="ts">
import { useDocs } from '../composables/use-docs';
import type { DocsTokensProps } from '../theme.types';
import TokensView from './TokensView.vue';

const { section } = defineProps<DocsTokensProps>();

const { texts } = useDocs();
</script>
