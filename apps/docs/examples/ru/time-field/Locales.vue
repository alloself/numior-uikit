<template>
  <div class="grid w-full gap-4 sm:grid-cols-3">
    <NuiTimeField v-model="delivery" label="Русский" locale="ru-RU" />
    <NuiTimeField v-model="delivery" label="Английский" locale="en-US" />
    <NuiTimeField v-model="delivery" label="Арабский" locale="ar-EG" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/kit';

const delivery = ref<string | null>('14:30');
</script>
