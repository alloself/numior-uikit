<template>
  <NuiAccordion v-model="question" :heading-level="3">
    <NuiAccordionItem value="ssr" label="Работает ли SSR?">
      Да: разметка детерминирована, id совпадают на сервере и клиенте.
    </NuiAccordionItem>
    <NuiAccordionItem value="tailwind" label="Нужен ли Tailwind?">
      Нет, компоненты работают на автономном CSS; интеграция с Tailwind опциональна.
    </NuiAccordionItem>
    <NuiAccordionItem value="rtl" label="Поддерживается ли RTL?">
      Да, через логические свойства и useDirection.
    </NuiAccordionItem>
  </NuiAccordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';

const question = ref<string | null>('ssr');
</script>
