<template>
  <NuiAccordion class="w-full max-w-md">
    <NuiAccordionItem value="delivery" label="Доставка">
      Курьер привезёт заказ 18 сентября, с 10 до 14 часов.
    </NuiAccordionItem>
    <NuiAccordionItem value="payment" label="Оплата">
      Заказ оплачен переводом, чек ушёл покупателю на почту.
    </NuiAccordionItem>
    <NuiAccordionItem value="refund" label="Возврат">
      Товар принимаем обратно в течение 14 дней после доставки.
    </NuiAccordionItem>
  </NuiAccordion>
</template>

<script setup lang="ts">
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';
</script>
