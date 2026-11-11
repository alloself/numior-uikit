<template>
  <div class="w-full grid-auto gap-6">
    <div ref="article" class="h-80 overflow-auto border rounded-md p-4" tabindex="0">
      <h2 id="toc-square-terms" class="mt-0 text-lg font-semibold">Return terms</h2>
      <p>A customer can return an item within 14 days after the order arrives.</p>
      <p>The packaging and the tags have to stay in place.</p>
      <h2 id="toc-square-request" class="text-lg font-semibold">How to file a return</h2>
      <p>A request is created on the order card with the “File a return” button.</p>
      <h3 id="toc-square-courier" class="font-semibold">By courier</h3>
      <p>A courier collects the parcel at the delivery address of the order.</p>
      <p>The customer picks the time in the confirmation email.</p>
      <h3 id="toc-square-pickup" class="font-semibold">At a pickup point</h3>
      <p>The customer brings the parcel to any pickup point and gives the request number.</p>
      <p>The point hands it over to the warehouse within two days.</p>
      <h2 id="toc-square-refund" class="text-lg font-semibold">Refund</h2>
      <p>The money goes back to the card that paid for the order.</p>
      <p>The bank credits it in three to five business days.</p>
      <p>The refund status shows in the Payments section.</p>
    </div>
    <NuiToc :items="items" :root="article" marker="square" />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { NuiToc, type NuiTocItem } from '@numior/vue';

const article = useTemplateRef<HTMLElement>('article');

const items: readonly NuiTocItem[] = [
  { id: 'toc-square-terms', label: 'Return terms' },
  {
    id: 'toc-square-request',
    label: 'How to file a return',
    children: [
      { id: 'toc-square-courier', label: 'By courier' },
      { id: 'toc-square-pickup', label: 'At a pickup point' },
    ],
  },
  { id: 'toc-square-refund', label: 'Refund' },
];
</script>
