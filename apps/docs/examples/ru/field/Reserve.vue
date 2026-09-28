<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <NuiSwitch v-model="failed">Показать ошибку</NuiSwitch>
    <NuiInput
      v-model="promo"
      label="Промокод"
      :error="failed ? 'Промокод не найден' : undefined"
      reserve-error
    />
    <NuiButton class="self-start">Применить</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSwitch } from '@numior/vue';

const failed = ref(false);
const promo = ref('SPRING');
</script>
