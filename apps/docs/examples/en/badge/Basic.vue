<template>
  <NuiBadge>Draft</NuiBadge>
  <NuiBadge tone="primary" icon="check">Done</NuiBadge>
  <NuiBadge tone="success" variant="outline">Paid</NuiBadge>
  <NuiBadge tone="warning" variant="solid" size="sm">Beta</NuiBadge>
</template>

<script setup lang="ts">
import { NuiBadge } from '@numior/vue';
</script>
