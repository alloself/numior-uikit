<template>
  <NuiCombobox v-model="assignee" :options="people" label="Исполнитель" placeholder="Назначить">
    <template #option="{ option }">
      <span>{{ option.label }}</span>
      <span class="text-muted-foreground ms-2">{{ option.description }}</span>
    </template>
  </NuiCombobox>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOptionSource } from '@numior/vue';

const assignee = ref<string | null>(null);

const people: NuiOptionSource<string> = [
  { value: 'titova', label: 'Анна Титова', description: 'дизайн' },
  { value: 'belov', label: 'Игорь Белов', description: 'разработка' },
];
</script>
