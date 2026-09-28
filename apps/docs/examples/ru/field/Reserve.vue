<template>
  <NuiSwitch v-model="failed" class="mb-4">Показать ошибку</NuiSwitch>
  <div class="flex gap-2 items-end">
    <NuiInput
      v-model="promo"
      label="Промокод"
      :error="failed ? 'Промокод не найден' : undefined"
      reserve-error
    />
    <NuiButton class="mb-5">Применить</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSwitch } from '@numior/vue';

const failed = ref(false);
const promo = ref('SPRING');
</script>
