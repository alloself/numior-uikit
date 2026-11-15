<template>
  <NuiCard href="#order-20411" class="w-full max-w-sm">
    <NuiCardHeader>
      <NuiCardTitle>Order 20411</NuiCardTitle>
      <NuiCardDescription>Nina Hart is waiting for a $498 invoice</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardFooter>
      <NuiButton size="sm" variant="outline" tone="neutral" :disabled="sent" @click="sent = true">
        {{ sent ? 'Invoice sent' : 'Send invoice' }}
      </NuiButton>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiCard,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/vue';

const sent = ref(false);
</script>
