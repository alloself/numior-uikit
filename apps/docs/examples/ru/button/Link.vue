<template>
  <NuiButton
    href="https://example.com/track/20407"
    target="_blank"
    rel="noreferrer"
    icon-end="external-link"
  >
    Отследить заказ
  </NuiButton>
  <NuiButton variant="outline" tone="neutral" href="mailto:maria@example.com">
    Написать менеджеру
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton } from '@numior/vue';
</script>
