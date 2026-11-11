<template>
  <TokenTable :rows="rows" :texts="texts" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { loadTokenReference } from '../reference';
import type { TokensViewProps } from '../theme.types';
import { tokenRowsOf } from '../token-sections';
import TokenTable from './TokenTable.vue';

const { section, texts } = defineProps<TokensViewProps>();

const tokens = await loadTokenReference();

const rows = computed(() => tokenRowsOf(tokens, section));
</script>
