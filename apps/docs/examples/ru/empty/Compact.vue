<template>
  <NuiEmpty
    size="sm"
    icon="search"
    title="Ничего не найдено"
    description="Попробуйте другой запрос"
  />
  <NuiEmpty size="sm" hide-icon title="Нет вариантов" />
</template>

<script setup lang="ts">
import { NuiEmpty } from '@numior/vue';
</script>
