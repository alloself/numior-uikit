<template>
  <NuiField group label="Shipping address" description="The courier brings the order here">
    <div class="grid grid-cols-[2fr_1fr] gap-3">
      <NuiInput v-model="city" label="City" autocomplete="address-level2" />
      <NuiInput
        v-model="zip"
        label="ZIP code"
        mask="#####"
        inputmode="numeric"
        autocomplete="postal-code"
      />
    </div>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput } from '@numior/kit';

const city = ref('Denver');
const zip = ref('');
</script>
