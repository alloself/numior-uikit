<template>
  <NuiAccordion class="w-full max-w-md">
    <NuiAccordionItem value="delivery" label="Delivery">
      A courier brings the order on September 18, between 10 a.m. and 2 p.m.
    </NuiAccordionItem>
    <NuiAccordionItem value="payment" label="Payment">
      Paid by bank transfer. The receipt went to the customer by email.
    </NuiAccordionItem>
    <NuiAccordionItem value="refund" label="Returns">
      We take the item back within 14 days of delivery.
    </NuiAccordionItem>
  </NuiAccordion>
</template>

<script setup lang="ts">
import { NuiAccordion, NuiAccordionItem } from '@numior/kit';
</script>
