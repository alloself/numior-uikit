<template>
  <span v-if="derivation !== undefined" class="inline-flex flex-wrap items-center gap-x-1">
    <template v-if="derivation.kind === TokenDerivationKind.Alias">
      {{ texts.tokenEquals }} <code>{{ derivation.source }}</code>
    </template>
    <template v-else>
      {{ derivation.share }}{{ texts.tokenPercentOf }} <code>{{ derivation.source }}</code>
      {{ overText }} <code v-if="overToken !== undefined">{{ overToken }}</code>
    </template>
    <NuiTooltip v-if="formula">
      <template #trigger="{ attrs }">
        <NuiButton
          v-bind="attrs"
          size="xs"
          variant="ghost"
          tone="neutral"
          icon="info"
          :aria-label="texts.tokenFormula"
        />
      </template>
      <code class="wrap-anywhere">{{ row.light }}</code>
    </NuiTooltip>
  </span>
  <code v-else class="wrap-anywhere">{{ row.light }}</code>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiButton, NuiTooltip } from '@numior/vue';
import { TokenDerivationKind, type TokenValueProps } from '../theme.types';

const SURFACE = '--color-surface';

const { row, texts } = defineProps<TokenValueProps>();

const derivation = computed(() => row.derivation);

const over = computed(() =>
  row.derivation?.kind === TokenDerivationKind.Mix ? row.derivation.over : undefined,
);

const overText = computed(() => {
  switch (over.value) {
    case undefined:
      return '';
    case SURFACE:
      return texts.tokenOverSurface;
    default:
      return texts.tokenOver;
  }
});

const overToken = computed(() => (over.value === SURFACE ? undefined : over.value));

const formula = computed(
  () =>
    row.derivation?.kind === TokenDerivationKind.Mix ||
    row.light.trim() !== `var(${row.derivation?.source ?? ''})`,
);
</script>
