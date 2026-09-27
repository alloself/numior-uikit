<template>
  <NuiField
    label="Work email"
    description="Mail arrives only at confirmed addresses"
    :error="error"
    required
  >
    <NuiInput v-model="email" type="email" placeholder="name@company.com" />
  </NuiField>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiField, NuiInput } from '@numior/vue';

const email = ref('');

const error = computed(() =>
  email.value !== '' && !email.value.includes('@') ? 'Enter an address with an @' : undefined,
);
</script>
