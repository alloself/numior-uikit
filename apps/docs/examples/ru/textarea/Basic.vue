<template>
  <NuiTextarea
    v-model="bio"
    label="О себе"
    description="Два-три предложения для профиля"
    :rows="4"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/vue';

const bio = ref('');
</script>
