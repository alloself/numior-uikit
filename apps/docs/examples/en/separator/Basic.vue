<template>
  <div class="nui-flex nui-flex-col nui-gap-4 nui-max-w-sm">
    <NuiButton variant="outline" tone="neutral">Continue with Google</NuiButton>
    <NuiSeparator label="or" />
    <NuiInput v-model="email" type="email" label="Email" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSeparator } from '@numior/vue';

const email = ref('');
</script>
