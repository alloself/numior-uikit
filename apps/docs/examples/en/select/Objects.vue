<template>
  <NuiSelect
    label="Assignee"
    v-model="assignee"
    :options="people"
    :get-key="keyOf"
    placeholder="Assign"
  >
    <template #option="{ option }">
      <span>{{ option.label }}</span>
      <span class="text-muted-foreground ms-2">{{ option.description }}</span>
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
  { value: { id: 1, name: 'Anna' }, label: 'Anna', description: 'Design' },
  { value: { id: 2, name: 'Igor' }, label: 'Igor', description: 'Engineering' },
];
</script>
