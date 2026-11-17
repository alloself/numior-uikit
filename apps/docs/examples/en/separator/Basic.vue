<template>
  <div class="flex flex-col gap-4 max-w-sm">
    <NuiButton variant="outline" tone="neutral">Continue with Google</NuiButton>
    <NuiSeparator label="or" />
    <NuiInput v-model="email" type="email" label="Email" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSeparator } from '@numior/kit';

const email = ref('');
</script>
