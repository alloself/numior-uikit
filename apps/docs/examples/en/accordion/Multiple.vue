<template>
  <NuiAccordion v-model:values="sections" multiple variant="card" class="w-full max-w-md">
    <NuiAccordionItem value="delivery" label="Delivery">
      A courier brings order 20411 to Austin on September 28, between 10 am and 6 pm.
    </NuiAccordionItem>
    <NuiAccordionItem value="payment" label="Payment">
      Bank transfer, the invoice went to nina.hart@example.com.
    </NuiAccordionItem>
    <NuiAccordionItem value="promo" label="Promo codes do not apply to discounted items" disabled />
  </NuiAccordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';

const sections = ref(['delivery', 'payment']);
</script>
