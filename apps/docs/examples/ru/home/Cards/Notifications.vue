<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Уведомления</NuiCardTitle>
      <NuiCardDescription>Что присылать менеджеру на почту</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent class="flex flex-col gap-4">
      <NuiSwitch v-model="paid" description="Как только покупатель оплатил заказ">
        Новые заказы
      </NuiSwitch>
      <NuiSwitch v-model="cancelled" description="Если покупатель отказался от заказа">
        Отмены
      </NuiSwitch>
      <NuiSwitch v-model="reviews" description="Раз в день, списком">Отзывы о товарах</NuiSwitch>
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
