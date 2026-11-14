<template>
  <div class="flex flex-col gap-3 text-sm">
    <p class="m-0 flex items-center gap-2">
      New orders
      <NuiBadge tone="primary" :count="3" />
    </p>
    <p class="m-0 flex items-center gap-2">
      Support messages
      <NuiBadge tone="error" :count="120" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { NuiBadge } from '@numior/vue';
</script>
