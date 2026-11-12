<template>
  <NuiField
    label="Артикул"
    description="Буква категории, дефис и номер товара"
    :error="error"
    required
  >
    <NuiInput v-model="sku" placeholder="S-101" />
  </NuiField>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiField, NuiInput } from '@numior/vue';

const SKU_RE = /^[A-Z]-\d{3}$/;

const sku = ref('');

const error = computed(() =>
  sku.value !== '' && !SKU_RE.test(sku.value) ? 'Запишите артикул как S-101' : undefined,
);
</script>
