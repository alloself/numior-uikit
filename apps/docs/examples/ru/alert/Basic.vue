<template>
  <NuiAlert title="Черновик сохранён" description="Синхронизация с сервером через минуту." />
  <NuiAlert tone="success" variant="outline" title="Проект опубликован" />
  <NuiAlert
    tone="error"
    variant="solid"
    title="Не удалось подключиться"
    description="Проверьте сеть и повторите."
  />
</template>

<script setup lang="ts">
import { NuiAlert } from '@numior/vue';
</script>
