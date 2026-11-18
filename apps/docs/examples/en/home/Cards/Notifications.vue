<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Notifications</NuiCardTitle>
      <NuiCardDescription>What the manager gets by email</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent class="flex flex-col gap-4">
      <NuiSwitch v-model="paid" description="As soon as a buyer pays for an order">
        New orders
      </NuiSwitch>
      <NuiSwitch v-model="cancelled" description="When a buyer cancels an order">
        Cancellations
      </NuiSwitch>
      <NuiSwitch v-model="reviews" description="Once a day, as a list">Product reviews</NuiSwitch>
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
  NuiSwitch,
} from '@numior/kit';

const paid = ref(true);
const cancelled = ref(true);
const reviews = ref(false);
</script>
