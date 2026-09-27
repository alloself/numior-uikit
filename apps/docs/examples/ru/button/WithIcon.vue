<template>
  <NuiButton>
    <NuiIcon alias="plus" />
    Добавить
  </NuiButton>
  <NuiButton variant="outline" tone="error">
    <NuiIcon alias="trash" />
    Удалить
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon } from '@numior/vue';
</script>
