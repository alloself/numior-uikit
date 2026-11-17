<template>
  <div class="flex flex-col items-center gap-3">
    <p class="m-0 text-sm">{{ cancelled ? 'Заказ 20411 отменён.' : 'Заказ 20411 ждёт оплаты.' }}</p>
    <NuiButton variant="outline" tone="error" :disabled="cancelled" @click="cancel">
      Отменить заказ
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, useToast } from '@numior/kit';

const toast = useToast();
const cancelled = ref(false);

const cancel = (): void => {
  cancelled.value = true;

  toast.show({
    title: 'Заказ 20411 отменён',
    description: 'Нина Зайцева получит письмо',
    action: {
      label: 'Вернуть',
      onClick: () => {
        cancelled.value = false;
      },
    },
  });
};
</script>
