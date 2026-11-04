<template>
  <div class="flex w-full flex-col gap-3">
    <NuiAlert title="Черновик сохранён" description="Синхронизация с сервером через минуту." />
    <NuiAlert tone="success" variant="outline" title="Проект опубликован" />
    <NuiAlert
      tone="error"
      variant="solid"
      title="Не удалось подключиться"
      description="Проверьте сеть и повторите."
    />
  </div>
</template>

<script setup lang="ts">
import { NuiAlert } from '@numior/vue';
</script>
