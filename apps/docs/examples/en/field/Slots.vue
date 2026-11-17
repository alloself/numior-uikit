<template>
  <NuiField>
    <template #label>
      Promo code
      <NuiLink href="#" class="ms-2 text-sm">Where do I get one?</NuiLink>
    </template>
    <NuiInput v-model="promo" placeholder="OSLO10" />
    <template #description>The discount applies to orders <strong>over $50</strong>.</template>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput, NuiLink } from '@numior/kit';

const promo = ref('');
</script>
