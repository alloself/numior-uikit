<template>
  <NuiButton variant="outline" @click="open = true">Принять условия</NuiButton>
  <NuiDialog v-model:open="open" :closable="false" title="Новые условия использования">
    <p>Продолжить работу можно только после подтверждения.</p>
    <template #footer>
      <NuiButton @click="open = false">Подтверждаю</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const open = ref(false);
</script>
