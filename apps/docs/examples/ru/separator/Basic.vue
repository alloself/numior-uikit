<template>
  <div class="nui-flex nui-flex-col nui-gap-4 nui-max-w-sm">
    <NuiButton variant="outline" tone="neutral">Продолжить с Google</NuiButton>
    <NuiSeparator label="или" />
    <NuiInput v-model="email" type="email" label="Почта" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSeparator } from '@numior/vue';

const email = ref('');
</script>
