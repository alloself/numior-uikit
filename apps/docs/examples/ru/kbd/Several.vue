<template>
  <p class="m-0 text-sm">
    Нажмите <NuiKbd :keys="['g', 'o']" />, чтобы открыть заказы, и <NuiKbd :keys="['g', 'p']" />,
    чтобы открыть товары.
  </p>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/kit';
</script>
