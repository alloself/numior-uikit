<template>
  <NuiEmpty title="Пока пусто" description="Создайте первый проект, чтобы увидеть его здесь.">
    <template #actions>
      <NuiButton size="sm">Создать проект</NuiButton>
    </template>
  </NuiEmpty>
</template>

<script setup lang="ts">
import { NuiButton, NuiEmpty } from '@numior/vue';
</script>
