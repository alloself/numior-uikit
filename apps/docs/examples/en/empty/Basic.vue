<template>
  <NuiEmpty
    title="No orders yet"
    description="Orders from the store show up here on their own. Create phone orders by hand."
  >
    <template #actions>
      <NuiButton size="sm" icon="plus">Create order</NuiButton>
    </template>
  </NuiEmpty>
</template>

<script setup lang="ts">
import { NuiButton, NuiEmpty } from '@numior/kit';
</script>
