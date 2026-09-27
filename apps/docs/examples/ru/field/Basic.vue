<template>
  <NuiField
    label="Рабочая почта"
    description="Письма приходят только на подтверждённые адреса"
    :error="error"
    required
  >
    <NuiInput v-model="email" type="email" placeholder="name@company.ru" />
  </NuiField>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiField, NuiInput } from '@numior/vue';

const email = ref('');

const error = computed(() =>
  email.value !== '' && !email.value.includes('@') ? 'Укажите адрес с символом @' : undefined,
);
</script>
