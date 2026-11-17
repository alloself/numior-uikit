<template>
  <div class="grid w-full gap-3 sm:grid-cols-3">
    <NuiCard
      v-for="option in options"
      :key="option.value"
      interactive
      padding="sm"
      @click="delivery = option.value"
    >
      <NuiCardHeader>
        <NuiCardTitle>{{ option.label }}</NuiCardTitle>
        <NuiCardDescription>{{ option.term }}</NuiCardDescription>
      </NuiCardHeader>
      <NuiCardFooter v-if="option.value === delivery">
        <NuiBadge tone="primary">Selected</NuiBadge>
      </NuiCardFooter>
    </NuiCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiBadge,
  NuiCard,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/kit';
import { DELIVERIES, type Delivery } from '#demo/orders';

const METHODS: readonly Delivery[] = ['courier', 'pickup', 'post'];

const TERMS: Record<Delivery, string> = {
  courier: 'Arrives tomorrow, 10 am to 6 pm',
  pickup: 'Ready for pickup today',
  post: 'Arrives in 5–7 days',
};

const options = METHODS.map((value) => ({ value, label: DELIVERIES[value], term: TERMS[value] }));

const delivery = ref<Delivery>('courier');
</script>
