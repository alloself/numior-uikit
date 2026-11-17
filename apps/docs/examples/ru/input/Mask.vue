<template>
  <NuiInput
    v-model.unmasked="phone"
    type="tel"
    mask="+7 (###) ###-##-##"
    label="Телефон покупателя"
    placeholder="+7 (900) 000-01-01"
    :description="description"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiInput } from '@numior/kit';

const PHONE_DIGITS = 10;

const phone = ref('');

const description = computed(() =>
  phone.value.length === PHONE_DIGITS
    ? `Курьер позвонит на +7${phone.value}`
    : 'Десять цифр после кода страны',
);
</script>
