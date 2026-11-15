<template>
  <NuiList
    v-model="delivery"
    :items="methods"
    selectable="single"
    variant="outline"
    label="Delivery method"
    class="w-full max-w-sm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, type NuiOption } from '@numior/vue';
import { DELIVERIES, type Delivery } from '#demo/orders';

const methods: NuiOption<Delivery>[] = [
  { value: 'courier', label: DELIVERIES.courier, description: 'Arrives tomorrow, 10 am to 6 pm' },
  { value: 'pickup', label: DELIVERIES.pickup, description: 'Ready for pickup today' },
  { value: 'post', label: DELIVERIES.post, description: 'Does not take furniture', disabled: true },
];

const delivery = ref<Delivery | null>('courier');
</script>
