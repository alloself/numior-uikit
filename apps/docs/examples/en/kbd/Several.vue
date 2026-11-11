<template>
  <p class="m-0 text-sm">
    Press <NuiKbd :keys="['g', 'o']" /> to open orders and <NuiKbd :keys="['g', 'p']" /> to open
    products.
  </p>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/vue';
</script>
