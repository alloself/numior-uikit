<template>
  <NuiToggleGroup v-model="scope" :items="scopes" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/vue';

const scope = ref<string | null>('all');

const scopes: NuiToggleItem[] = [
  { value: 'all', label: 'Все', icon: 'inbox' },
  { value: 'new', label: 'Новые', icon: 'clock' },
  { value: 'mine', label: 'Мои', icon: 'user' },
];
</script>
