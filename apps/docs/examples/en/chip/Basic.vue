<template>
  <NuiChip tone="success">Paid</NuiChip>
  <NuiChip tone="warning" variant="outline">Awaiting stock</NuiChip>
  <NuiChip tone="error" variant="solid">Cancelled</NuiChip>
  <NuiChip tone="info" icon="check">Delivered</NuiChip>
</template>

<script setup lang="ts">
import { NuiChip } from '@numior/vue';
</script>
