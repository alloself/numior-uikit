<template>
  <NuiInput
    v-model="email"
    type="email"
    label="Customer email"
    description="The receipt and the tracking number go here"
    placeholder="peter.wolfe@example.com"
    autocomplete="email"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/kit';

const email = ref('');
</script>
