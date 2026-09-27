<template>
  <NuiInput model-value="ORD-20419" label="Order number" readonly />
  <NuiInput model-value="Anna Titova" label="Recipient" disabled />
  <NuiInput
    v-model="email"
    type="email"
    label="Email"
    error="Enter an address with an @"
    reserve-error
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const email = ref('anna.titova');
</script>
