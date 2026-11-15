<template>
  <NuiCard href="#order-20411" class="w-full max-w-sm">
    <NuiCardHeader>
      <NuiCardTitle>Заказ 20411</NuiCardTitle>
      <NuiCardDescription>Нина Зайцева ждёт счёт на 37 800 ₽</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardFooter>
      <NuiButton size="sm" variant="outline" tone="neutral" :disabled="sent" @click="sent = true">
        {{ sent ? 'Счёт отправлен' : 'Отправить счёт' }}
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
