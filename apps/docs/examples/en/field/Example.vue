<template>
  <NuiField>
    <NuiInput v-model="email" type="email" placeholder="peter.wolfe@example.com" />
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput } from '@numior/kit';

const email = ref('');
</script>
