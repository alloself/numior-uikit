<template>
  <NuiCode :code="log" :max-lines="4" wrap :copyable="false" />
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/kit';

const log = [
  '[10:02:11] order export started',
  '[10:02:12] order 20407: one Arc floor lamp and three Sphere pendants, by mail to Portland, paid by bank transfer, manager Maria Kim',
  '[10:02:13] order 20408: shipped by courier to Boston',
  '[10:02:14] order 20409: waiting for pickup in Chicago',
  '[10:02:15] order 20410: paid by card',
  '[10:02:16] exported 4 orders, no errors',
].join('\n');
</script>
