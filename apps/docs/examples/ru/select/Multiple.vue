<template>
  <NuiSelect
    v-model:values="recipients"
    :options="people"
    label="Кому сообщать о новых заказах"
    placeholder="Выберите сотрудников"
    multiple
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect } from '@numior/vue';
import { team } from '#demo/team';

const recipients = ref(['anna', 'maria']);

const people = team.map((person) => ({
  value: person.id,
  label: person.name,
  description: person.role,
}));
</script>
