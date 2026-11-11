<template>
  <ul>
    <li v-for="order in orders" :key="order.id">{{ order.customer }}</li>
  </ul>
</template>

<script setup lang="ts">
import { orders } from '#demo/orders';
</script>
