<template>
  <span v-if="row.sample === TokenSample.Color" aria-hidden="true" class="inline-flex gap-1">
    <span
      v-for="scheme in SCHEMES"
      :key="scheme"
      :data-nui-theme="scheme"
      :data-nui-accent="DocsAccent.Indigo"
      class="block size-6 overflow-hidden rounded-sm border bg-surface"
    >
      <span class="block size-full" :style="{ backgroundColor: value }" />
    </span>
  </span>
  <span
    v-else-if="row.sample !== TokenSample.None"
    aria-hidden="true"
    data-nui-theme=""
    :data-nui-accent="DocsAccent.Indigo"
    class="inline-flex items-center text-foreground"
  >
    <span
      v-if="row.sample === TokenSample.Radius"
      class="block size-6 border border-border-strong bg-surface-muted"
      :style="{ borderRadius: value }"
    />
    <span
      v-else-if="row.sample === TokenSample.Size"
      class="block h-2 rounded-sm bg-primary"
      :style="{ inlineSize: value }"
    />
    <span
      v-else-if="row.sample === TokenSample.Shadow"
      class="block size-6 rounded-sm bg-surface"
      :style="{ boxShadow: value }"
    />
    <span v-else class="leading-none" :style="textStyle">Aa</span>
  </span>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { DocsAccent, TokenSample, type TokenSampleProps } from '../theme.types';

const SCHEMES = ['light', 'dark'] as const;

const { row } = defineProps<TokenSampleProps>();

const value = computed(() => `var(${row.name})`);

const textStyle = computed<CSSProperties>(() => {
  switch (row.sample) {
    case TokenSample.FontSize:
      return { fontSize: value.value };
    case TokenSample.FontWeight:
      return { fontWeight: value.value };
    default:
      return { fontFamily: value.value };
  }
});
</script>
