<template>
  <NuiEmpty title="Nothing here yet" description="Create the first project to see it here.">
    <template #actions>
      <NuiButton size="sm">Create project</NuiButton>
    </template>
  </NuiEmpty>
</template>

<script setup lang="ts">
import { NuiButton, NuiEmpty } from '@numior/vue';
</script>
