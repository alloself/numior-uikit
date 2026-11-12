<template>
  <NuiRadioGroup
    v-model="payment"
    label="Payment method"
    description="You can change it until the order ships"
  >
    <NuiRadio value="card">Card</NuiRadio>
    <NuiRadio value="transfer">Bank transfer</NuiRadio>
    <NuiRadio value="cash">On delivery</NuiRadio>
  </NuiRadioGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/vue';

const payment = ref('card');
</script>
