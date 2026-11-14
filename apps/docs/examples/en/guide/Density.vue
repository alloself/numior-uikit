<template>
  <div class="w-full grid-auto gap-6">
    <div class="flex flex-col gap-3">
      <p class="m-0 text-sm text-muted-foreground">No class</p>
      <NuiInput v-model="query" label="Search" placeholder="Product name" />
      <div class="flex gap-2">
        <NuiButton>Find</NuiButton>
        <NuiButton variant="outline" tone="neutral">Reset</NuiButton>
      </div>
    </div>
    <div class="nui-theme--density-compact flex flex-col gap-3">
      <p class="m-0 text-sm text-muted-foreground">nui-theme--density-compact</p>
      <NuiInput v-model="query" label="Search" placeholder="Product name" />
      <div class="flex gap-2">
        <NuiButton>Find</NuiButton>
        <NuiButton variant="outline" tone="neutral">Reset</NuiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput } from '@numior/vue';

const query = ref('');
</script>
