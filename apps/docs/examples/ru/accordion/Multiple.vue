<template>
  <NuiAccordion v-model:values="sections" multiple variant="card">
    <NuiAccordionItem value="address" label="Адрес доставки">Москва, Тверская, 7</NuiAccordionItem>
    <NuiAccordionItem value="payment" label="Оплата">Карта •••• 4242</NuiAccordionItem>
    <NuiAccordionItem value="promo" label="Промокод" disabled
      >Недоступно для этого заказа</NuiAccordionItem
    >
  </NuiAccordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';

const sections = ref(['address', 'payment']);
</script>
