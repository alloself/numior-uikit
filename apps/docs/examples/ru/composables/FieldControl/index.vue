<template>
  <NuiField label="Оценка" description="От 1 до 5" class="max-w-sm">
    <RatingControl v-model="rating" />
    <p class="m-0 text-sm text-muted-foreground">Оценка: {{ rating }} из 5</p>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField } from '@numior/vue';
import RatingControl from './RatingControl.vue';

const rating = ref(4);
</script>
