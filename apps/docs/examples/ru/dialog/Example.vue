<template>
  <NuiButton variant="outline" tone="neutral" @click="open = true">Оформить возврат</NuiButton>
  <NuiDialog v-model:open="open" v-bind="$attrs">
    <p>Товар вернётся на склад после приёмки. Отменить возврат потом нельзя.</p>
    <template #footer>
      <form method="dialog" class="flex gap-2">
        <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Отмена</NuiButton>
        <NuiButton type="submit" value="confirm">Вернуть деньги</NuiButton>
      </form>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const open = ref(false);
</script>
