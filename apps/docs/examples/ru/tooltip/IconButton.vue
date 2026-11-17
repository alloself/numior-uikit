<template>
  <NuiTooltip>
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        variant="ghost"
        tone="neutral"
        icon="refresh"
        aria-label="Обновить статус оплаты"
        :loading="checking"
        @click="check"
      />
    </template>
    Спросим банк, пришли ли деньги за заказ 20411
  </NuiTooltip>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiButton, NuiTooltip } from '@numior/kit';

const checking = ref(false);

const check = async (): Promise<void> => {
  checking.value = true;
  await promiseTimeout(1500);
  checking.value = false;
};
</script>
