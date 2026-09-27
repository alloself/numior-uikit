<template>
  <NuiAvatarGroup :items="team" :max="3" size="lg" label="Project team" />
</template>

<script setup lang="ts">
import { NuiAvatarGroup, type NuiAvatarItem } from '@numior/vue';

const team: NuiAvatarItem[] = [
  { name: 'Anna Titova' },
  { name: 'Igor Belov' },
  { name: 'Maria Kim' },
  { name: 'Oleg Smirnov' },
  { name: 'Dina Akhmetova' },
];
</script>
