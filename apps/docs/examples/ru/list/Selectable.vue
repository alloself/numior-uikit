<template>
  <div class="nui-flex nui-flex-col nui-gap-3 nui-w-full nui-max-w-sm">
    <NuiList
      v-model:values="picked"
      :items="languages"
      selectable="multiple"
      variant="bordered"
      label="Языки интерфейса"
      class="nui-w-full nui-max-w-sm"
    />
    <p class="nui-text-sm nui-text-muted">Выбрано: {{ picked.join(', ') || '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, type NuiOption } from '@numior/vue';

const picked = ref(['ru']);

const languages: NuiOption<string>[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'kk', label: 'Қазақша', disabled: true },
];
</script>
