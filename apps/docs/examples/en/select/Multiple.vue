<template>
  <NuiSelect
    v-model:values="recipients"
    :options="people"
    label="Notify about new orders"
    placeholder="Pick team members"
    multiple
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect } from '@numior/kit';
import { team } from '#demo/team';

const recipients = ref(['anna', 'maria']);

const people = team.map((person) => ({
  value: person.id,
  label: person.name,
  description: person.role,
}));
</script>
