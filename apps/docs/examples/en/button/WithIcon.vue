<template>
  <NuiButton>
    <NuiIcon alias="plus" />
    Add
  </NuiButton>
  <NuiButton variant="outline" tone="error">
    <NuiIcon alias="trash" />
    Delete
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon } from '@numior/vue';
</script>
