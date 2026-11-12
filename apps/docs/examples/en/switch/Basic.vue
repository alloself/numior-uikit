<template>
  <NuiSwitch
    v-model="visible"
    description="Customers see them in the catalog marked as out of stock"
  >
    Show out-of-stock products
  </NuiSwitch>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSwitch } from '@numior/vue';

const visible = ref(true);
</script>
