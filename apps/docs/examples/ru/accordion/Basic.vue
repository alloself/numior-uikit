<template>
  <NuiAccordion v-model="question" :heading-level="3" class="w-full max-w-md">
    <NuiAccordionItem value="delivery" label="Сколько стоит доставка?">
      Курьер по городу стоит 500 ₽, а заказ от 30 000 ₽ привезём бесплатно. Самовывоз бесплатный
      всегда.
    </NuiAccordionItem>
    <NuiAccordionItem value="return" label="Как вернуть товар?">
      Оформите возврат в течение 14 дней после доставки, и курьер заберёт товар сам.
    </NuiAccordionItem>
    <NuiAccordionItem value="installments" label="Можно оплатить частями?">
      Да, заказ от 10 000 ₽ можно разбить на четыре платежа без переплаты.
    </NuiAccordionItem>
  </NuiAccordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAccordion, NuiAccordionItem } from '@numior/kit';

const question = ref<string | null>('delivery');
</script>
