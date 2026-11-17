<template>
  <NuiToggleGroup v-model="scope" :items="scopes" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/kit';

const scope = ref<string | null>('all');

const scopes: NuiToggleItem[] = [
  { value: 'all', label: 'All', icon: 'inbox' },
  { value: 'new', label: 'New', icon: 'clock' },
  { value: 'mine', label: 'Mine', icon: 'user' },
];
</script>
