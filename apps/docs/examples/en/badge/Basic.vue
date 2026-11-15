<template>
  <NuiBadge tone="warning">Awaiting payment</NuiBadge>
  <NuiBadge tone="success">Paid</NuiBadge>
  <NuiBadge tone="info">Shipped</NuiBadge>
  <NuiBadge tone="error">Canceled</NuiBadge>
</template>

<script setup lang="ts">
import { NuiBadge } from '@numior/vue';
</script>
