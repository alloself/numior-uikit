<template>
  <NuiSwitch v-model="failed" class="nui-mb-4">Показать ошибку</NuiSwitch>
  <div class="nui-flex nui-gap-2 nui-items-end">
    <NuiInput
      v-model="promo"
      label="Промокод"
      :error="failed ? 'Промокод не найден' : undefined"
      reserve-error
    />
    <NuiButton class="nui-mb-5">Применить</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSwitch } from '@numior/vue';

const failed = ref(false);
const promo = ref('SPRING');
</script>
