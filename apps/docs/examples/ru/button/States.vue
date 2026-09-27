<template>
  <NuiButton disabled>Недоступно</NuiButton>
  <NuiButton :loading="loading" @click="loading = true">Отправить</NuiButton>
  <NuiButton variant="outline" tone="neutral" @click="loading = false">Сбросить</NuiButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton } from '@numior/vue';

const loading = ref(false);
</script>
