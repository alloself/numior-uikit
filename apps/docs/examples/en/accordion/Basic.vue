<template>
  <NuiAccordion v-model="question" :heading-level="3" class="w-full max-w-md">
    <NuiAccordionItem value="delivery" label="How much is delivery?">
      A courier in the city costs $15, and orders over $500 ship free. Pickup is always free.
    </NuiAccordionItem>
    <NuiAccordionItem value="return" label="How do I return an item?">
      Request a return within 14 days of delivery, and a courier picks the item up.
    </NuiAccordionItem>
    <NuiAccordionItem value="installments" label="Can I pay in installments?">
      Yes, orders over $150 split into four payments with no extra fees.
    </NuiAccordionItem>
  </NuiAccordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAccordion, NuiAccordionItem } from '@numior/kit';

const question = ref<string | null>('delivery');
</script>
