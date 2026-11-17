<template>
  <NuiCard class="w-full max-w-sm">
    <NuiCardMedia :src="cover" alt="" aspect="2 / 1" />
    <NuiCardHeader>
      <NuiCardTitle>Кресло «Осло»</NuiCardTitle>
      <NuiCardDescription>18 900 ₽, на складе 12 шт.</NuiCardDescription>
    </NuiCardHeader>
  </NuiCard>
</template>

<script setup lang="ts">
import {
  NuiCard,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
} from '@numior/kit';

const cover =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E%3Cstop offset='0' stop-color='%234f46e5'/%3E%3Cstop offset='1' stop-color='%2306b6d4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='100' fill='url(%23g)'/%3E%3C/svg%3E";
</script>
