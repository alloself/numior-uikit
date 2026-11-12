<template>
  <NuiField>
    <template #label>
      Промокод
      <NuiLink href="#" class="ms-2 text-sm">Где взять?</NuiLink>
    </template>
    <NuiInput v-model="promo" placeholder="OSLO10" />
    <template #description>Скидка действует на заказы <strong>от 5 000 ₽</strong>.</template>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput, NuiLink } from '@numior/vue';

const promo = ref('');
</script>
