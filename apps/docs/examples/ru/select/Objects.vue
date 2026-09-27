<template>
  <NuiSelect
    label="Исполнитель"
    v-model="assignee"
    :options="people"
    :get-key="keyOf"
    placeholder="Назначить"
  >
    <template #option="{ option }">
      <span>{{ option.label }}</span>
      <span class="nui-text-muted nui-ms-2">{{ option.description }}</span>
    </template>
  </NuiSelect>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';

interface Person {
  readonly id: number;
  readonly name: string;
}

const assignee = ref<Person | null>(null);
const keyOf = (person: Person): string => String(person.id);

const people: NuiOptionSource<Person> = [
  { value: { id: 1, name: 'Анна' }, label: 'Анна', description: 'Дизайн' },
  { value: { id: 2, name: 'Игорь' }, label: 'Игорь', description: 'Разработка' },
];
</script>
