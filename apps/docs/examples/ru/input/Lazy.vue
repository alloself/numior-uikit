<template>
  <NuiInput
    v-model.lazy.trim="city"
    label="Город доставки"
    :description="description"
    placeholder="Казань"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiInput } from '@numior/kit';

const city = ref('');

const description = computed(() =>
  city.value === '' ? 'Город в заказе пока не указан' : `В заказе указан город ${city.value}`,
);
</script>
