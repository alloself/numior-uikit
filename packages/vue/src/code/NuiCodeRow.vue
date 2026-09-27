<template>
  <span class="nui-code__line" :class="{ 'nui-code__line--highlighted': highlighted }">
    <template v-for="(token, position) in tokens" :key="position">
      <span
        v-if="token.scope"
        class="nui-code__token"
        :class="`nui-code__token--scope-${token.scope}`"
        >{{ token.text }}</span
      >
      <template v-else>{{ token.text }}</template>
    </template>
  </span>
</template>

<script setup lang="ts">
import type { NuiCodeRowProps } from './code.types';

const { tokens, highlighted = false } = defineProps<NuiCodeRowProps>();
</script>
