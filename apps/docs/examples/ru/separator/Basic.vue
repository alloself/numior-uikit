<template>
  <div class="flex flex-col gap-4 max-w-sm">
    <NuiButton variant="outline" tone="neutral">Продолжить с Google</NuiButton>
    <NuiSeparator label="или" />
    <NuiInput v-model="email" type="email" label="Почта" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSeparator } from '@numior/kit';

const email = ref('');
</script>
