<template>
  <NuiField group label="Адрес доставки" description="Курьер привезёт заказ по этому адресу">
    <div class="grid grid-cols-[2fr_1fr] gap-3">
      <NuiInput v-model="city" label="Город" autocomplete="address-level2" />
      <NuiInput
        v-model="zip"
        label="Индекс"
        mask="######"
        inputmode="numeric"
        autocomplete="postal-code"
      />
    </div>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput } from '@numior/kit';

const city = ref('Казань');
const zip = ref('');
</script>
