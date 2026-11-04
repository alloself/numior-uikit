<template>
  <div class="flex w-full flex-col gap-3">
    <NuiAlert v-model:open="open" tone="warning" title="Черновик не сохранён" dismissible>
      Изменения пропадут при выходе со страницы.
      <template #actions>
        <NuiButton size="sm" variant="outline" tone="warning" @click="open = false"
          >Сохранить</NuiButton
        >
      </template>
    </NuiAlert>
    <NuiButton
      v-if="!open"
      class="self-start"
      size="sm"
      variant="ghost"
      tone="neutral"
      @click="open = true"
    >
      Показать снова
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAlert, NuiButton } from '@numior/vue';

const open = ref(true);
</script>
