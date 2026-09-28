<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <NuiList
      v-model:values="picked"
      :items="languages"
      selectable="multiple"
      variant="bordered"
      label="Языки интерфейса"
      class="w-full max-w-sm"
    />
    <p class="text-sm text-muted-foreground">Выбрано: {{ picked.join(', ') || '—' }}</p>
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
