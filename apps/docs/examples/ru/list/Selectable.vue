<template>
  <NuiList
    v-model="delivery"
    :items="methods"
    selectable="single"
    variant="outline"
    label="Способ доставки"
    class="w-full max-w-sm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, type NuiOption } from '@numior/vue';
import { DELIVERIES, type Delivery } from '#demo/orders';

const methods: NuiOption<Delivery>[] = [
  { value: 'courier', label: DELIVERIES.courier, description: 'Привезёт завтра, с 10 до 18' },
  { value: 'pickup', label: DELIVERIES.pickup, description: 'Можно забрать сегодня' },
  { value: 'post', label: DELIVERIES.post, description: 'Не принимает мебель', disabled: true },
];

const delivery = ref<Delivery | null>('courier');
</script>
