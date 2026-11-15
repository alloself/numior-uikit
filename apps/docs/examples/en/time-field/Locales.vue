<template>
  <div class="grid w-full gap-4 sm:grid-cols-3">
    <NuiTimeField v-model="delivery" label="English" locale="en-US" />
    <NuiTimeField v-model="delivery" label="Russian" locale="ru-RU" />
    <NuiTimeField v-model="delivery" label="Arabic" locale="ar-EG" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const delivery = ref<string | null>('14:30');
</script>
