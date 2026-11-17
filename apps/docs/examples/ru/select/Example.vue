<template>
  <NuiSelect v-model="manager" :options="managers" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect } from '@numior/kit';
import { team } from '#demo/team';

const manager = ref<string | null>(null);
const managers = team.map((person) => ({ value: person.id, label: person.name }));
</script>
