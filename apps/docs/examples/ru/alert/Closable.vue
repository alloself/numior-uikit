<template>
  <div class="flex w-full flex-col gap-3">
    <NuiAlert v-model:open="open" tone="warning" title="Табурет «Лофт» закончился" closable>
      Покупатели видят его в каталоге, но заказать не могут.
      <template #actions>
        <NuiButton size="sm" tone="warning" @click="open = false">Заказать у поставщика</NuiButton>
        <NuiButton size="sm" variant="outline" tone="warning" @click="open = false">
          Снять с витрины
        </NuiButton>
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
