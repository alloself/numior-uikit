<template>
  <NuiAccordion v-model:values="sections" multiple variant="card">
    <NuiAccordionItem value="address" label="Delivery address"
      >7 Tverskaya St, Moscow</NuiAccordionItem
    >
    <NuiAccordionItem value="payment" label="Payment">Card •••• 4242</NuiAccordionItem>
    <NuiAccordionItem value="promo" label="Promo code" disabled
      >Not available for this order</NuiAccordionItem
    >
  </NuiAccordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';

const sections = ref(['address', 'payment']);
</script>
