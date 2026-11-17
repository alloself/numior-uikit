<template>
  <NuiAccordion v-model:values="sections" multiple variant="card" class="w-full max-w-md">
    <NuiAccordionItem value="delivery" label="Доставка">
      Курьер привезёт заказ 20411 в Екатеринбург 28 сентября, с 10 до 18.
    </NuiAccordionItem>
    <NuiAccordionItem value="payment" label="Оплата">
      Переводом по счёту, счёт ушёл на zaitseva@example.com.
    </NuiAccordionItem>
    <NuiAccordionItem value="promo" label="Промокод не действует на товары со скидкой" disabled />
  </NuiAccordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAccordion, NuiAccordionItem } from '@numior/kit';

const sections = ref(['delivery', 'payment']);
</script>
