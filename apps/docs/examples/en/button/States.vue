<template>
  <NuiButton disabled>Unavailable</NuiButton>
  <NuiButton :loading="loading" @click="loading = true">Submit</NuiButton>
  <NuiButton variant="outline" tone="neutral" @click="loading = false">Reset</NuiButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton } from '@numior/vue';

const loading = ref(false);
</script>
