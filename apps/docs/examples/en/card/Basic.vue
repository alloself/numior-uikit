<template>
  <NuiCard class="w-full max-w-sm">
    <NuiCardHeader>
      <NuiCardTitle>Order 20408</NuiCardTitle>
      <NuiCardDescription>Paul Hawkins, Boston</NuiCardDescription>
      <template #actions>
        <NuiBadge tone="info">Shipped</NuiBadge>
      </template>
    </NuiCardHeader>
    <NuiCardContent>Fjord dresser and Nord table lamp, $368.</NuiCardContent>
    <NuiCardFooter>
      <NuiButton size="sm">Open order</NuiButton>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import {
  NuiBadge,
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/vue';
</script>
