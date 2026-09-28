<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <NuiList
      v-model:values="picked"
      :items="languages"
      selectable="multiple"
      variant="bordered"
      label="Interface languages"
      class="w-full max-w-sm"
    />
    <p class="text-sm text-muted-foreground">Selected: {{ picked.join(', ') || '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, type NuiOption } from '@numior/vue';

const picked = ref(['en']);

const languages: NuiOption<string>[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'de', label: 'Deutsch' },
  { value: 'kk', label: 'Қазақша', disabled: true },
];
</script>
