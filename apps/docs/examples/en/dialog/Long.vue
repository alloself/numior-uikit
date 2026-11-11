<template>
  <NuiButton variant="outline" @click="open = true">Delivery and returns</NuiButton>
  <NuiDialog v-model:open="open" :title="TITLE" :description="DESCRIPTION">
    <ol class="m-0 flex list-decimal flex-col gap-3 ps-5">
      <li v-for="term in TERMS" :key="term">{{ term }}</li>
    </ol>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Cancel</NuiButton>
      <NuiButton @click="open = false">Accept</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const TITLE = 'Delivery and returns';
const DESCRIPTION = 'Read to the end to accept.';

const TERMS = [
  'An order is accepted once a manager has confirmed it by phone or by email.',
  'The price is fixed at confirmation and does not change until the order is received.',
  'Pay by card on the site, by bank transfer against an invoice, or on delivery.',
  'The courier brings the order on the agreed day between ten in the morning and nine at night.',
  'The courier calls the number given in the order an hour before arrival.',
  'Delivery within the city is free for orders over three hundred dollars.',
  'Carrying an order upstairs without an elevator is charged at the delivery service rate.',
  'Furniture heavier than sixty pounds is carried in by two movers.',
  'Check the packaging and the contents with the courier and sign the delivery note.',
  'The courier records damage found on receipt, and the store replaces the item.',
  'Assembly can be ordered with delivery or within a week after it.',
  'Pickup from the warehouse is open every day, and an order is kept for five days.',
  'An item can be returned without giving a reason within fourteen days.',
  'A return is accepted in the original packaging and without signs of use.',
  'Furniture made to custom dimensions cannot be returned.',
  'The money goes back the same way the order was paid, within ten days.',
  'The warranty lasts two years for furniture and one year for lighting.',
  'Under the warranty the store repairs the item or replaces it with the same one.',
  'The manager who handles the order settles disputed cases.',
  'The store keeps order data for three years and deletes it at the written request of the customer.',
];

const open = ref(false);
</script>
