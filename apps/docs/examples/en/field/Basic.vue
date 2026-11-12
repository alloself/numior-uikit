<template>
  <NuiField
    label="SKU"
    description="A category letter, a hyphen and the product number"
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
  sku.value !== '' && !SKU_RE.test(sku.value) ? 'Write the SKU like S-101' : undefined,
);
</script>
