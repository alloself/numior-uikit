<template>
  <NuiRadioGroup
    v-model="payment"
    label="Способ оплаты"
    description="Изменить его можно до отправки"
  >
    <NuiRadio value="card">Картой</NuiRadio>
    <NuiRadio value="transfer">Переводом</NuiRadio>
    <NuiRadio value="cash">При получении</NuiRadio>
  </NuiRadioGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/vue';

const payment = ref('card');
</script>
