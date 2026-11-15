<template>
  <div class="flex flex-col gap-3 text-sm">
    <p class="m-0 flex items-center gap-2">
      <NuiBadge tone="success" dot label="Online" />
      Anna Turner, order manager
    </p>
    <p class="m-0 flex items-center gap-2">
      <NuiBadge dot label="Offline" />
      Ian Bell, warehouse
    </p>
  </div>
</template>

<script setup lang="ts">
import { NuiBadge } from '@numior/vue';
</script>
