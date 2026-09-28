<template>
  <form class="flex flex-col gap-3 max-w-sm" @submit.prevent="saved = true">
    <NuiInput v-model="name" label="Name" description="How to address you" />
    <div class="flex items-center gap-3">
      <NuiButton type="submit">Save</NuiButton>
      <span v-if="saved">Saved: {{ name }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput } from '@numior/vue';

const name = ref('');
const saved = ref(false);
</script>
