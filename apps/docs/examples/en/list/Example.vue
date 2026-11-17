<template>
  <NuiList :items="people" class="w-full max-w-sm" />
</template>

<script setup lang="ts">
import { NuiList, type NuiOption } from '@numior/kit';
import { team } from '#demo/team';

const people: NuiOption[] = team.map((person) => ({
  value: person.id,
  label: person.name,
  description: person.role,
  icon: 'user',
}));
</script>
