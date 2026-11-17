<template>
  <NuiInput
    v-model.lazy.trim="city"
    label="Delivery city"
    :description="description"
    placeholder="Denver"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiInput } from '@numior/kit';

const city = ref('');

const description = computed(() =>
  city.value === '' ? 'The order has no city yet' : `The order ships to ${city.value}`,
);
</script>
