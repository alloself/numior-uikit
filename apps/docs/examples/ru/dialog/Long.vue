<template>
  <NuiButton variant="outline" @click="open = true">Условия сервиса</NuiButton>
  <NuiDialog v-model:open="open" :title="TITLE" :description="DESCRIPTION">
    <p v-for="term in TERMS" :key="term">{{ term }}</p>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Отмена</NuiButton>
      <NuiButton @click="open = false">Принять</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const TITLE = 'Условия сервиса';
const DESCRIPTION = 'Прочитайте до конца, чтобы принять.';

const TERM =
  'Сервис хранит данные проекта, пока аккаунт активен, и удаляет их через тридцать дней после закрытия.';

const TERMS = Array.from({ length: 12 }, (_, index) => `${index + 1}. ${TERM}`);

const open = ref(false);
</script>
