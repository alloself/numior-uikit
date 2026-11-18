<template>
  <span v-if="row.sample === TokenSample.Color" aria-hidden="true" class="inline-flex gap-1">
    <span
      v-for="scheme in SCHEMES"
      :key="scheme"
      :class="`nui-theme--${scheme}`"
      class="block size-6 overflow-hidden rounded-sm border bg-surface"
    >
      <span class="block size-full" :style="{ backgroundColor: row.value }" />
    </span>
  </span>
  <span
    v-else-if="row.sample !== TokenSample.None"
    aria-hidden="true"
    class="inline-flex items-center text-foreground"
  >
    <span
      v-if="row.sample === TokenSample.Radius"
      class="block size-10 border border-border-strong bg-surface-muted"
      :style="{ borderRadius: row.value }"
    />
    <span
      v-else-if="row.sample === TokenSample.Size"
      class="block h-2 rounded-sm bg-primary"
      :style="{ inlineSize: row.value }"
    />
    <span
      v-else-if="row.sample === TokenSample.Shadow"
      class="block size-6 rounded-sm bg-surface"
      :style="{ boxShadow: row.value }"
    />
    <span v-else class="leading-none" :style="textStyle">Aa</span>
  </span>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { TokenSample, type TokenSampleProps } from '../theme.types';

const SCHEMES = ['light', 'dark'] as const;

const { row } = defineProps<TokenSampleProps>();

const textStyle = computed<CSSProperties>(() => {
  switch (row.sample) {
    case TokenSample.FontSize:
      return { fontSize: row.value };
    case TokenSample.FontWeight:
      return { fontWeight: row.value };
    default:
      return { fontFamily: row.value };
  }
});
</script>
