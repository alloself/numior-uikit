<template>
  <NuiTextarea
    v-model="bio"
    label="About you"
    description="Two or three sentences for the profile"
    :rows="4"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/vue';

const bio = ref('');
</script>
