<template>
  <div class="flex flex-col gap-4">
    <NuiSwitch v-model="notify.order" description="Письмо менеджеру, как только заказ оплачен">
      Новый заказ
    </NuiSwitch>
    <NuiSwitch v-model="notify.cancel" description="Письмо и уведомление в кабинете">
      Отмена заказа
    </NuiSwitch>
    <NuiSwitch v-model="notify.review" description="Сводка отзывов раз в день, в 9:00">
      Новый отзыв
    </NuiSwitch>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { NuiSwitch } from '@numior/vue';

const notify = reactive({ order: true, cancel: true, review: false });
</script>
