<template>
  <NuiAvatarGroup :items="team" :max="3" size="lg" label="Команда проекта" />
</template>

<script setup lang="ts">
import { NuiAvatarGroup, type NuiAvatarItem } from '@numior/vue';

const team: NuiAvatarItem[] = [
  { name: 'Анна Титова' },
  { name: 'Игорь Белов' },
  { name: 'Мария Ким' },
  { name: 'Олег Смирнов' },
  { name: 'Дина Ахметова' },
];
</script>
