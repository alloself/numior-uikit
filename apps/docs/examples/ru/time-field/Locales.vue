<template>
  <NuiTimeField v-model="meeting" label="Встреча (ru-RU)" locale="ru-RU" />
  <NuiTimeField v-model="meeting" label="Meeting (en-US)" locale="en-US" />
  <NuiTimeField v-model="meeting" label="الاجتماع (ar-EG)" locale="ar-EG" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const meeting = ref<string | null>('14:15');
</script>
