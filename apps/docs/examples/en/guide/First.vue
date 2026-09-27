<template>
  <form class="nui-flex nui-flex-col nui-gap-3 nui-max-w-sm" @submit.prevent="saved = true">
    <NuiField label="Name" description="How to address you">
      <NuiInput v-model="name" />
    </NuiField>
    <div class="nui-flex nui-items-center nui-gap-3">
      <NuiButton type="submit">Save</NuiButton>
      <span v-if="saved">Saved: {{ name }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiField, NuiInput } from '@numior/vue';

const name = ref('');
const saved = ref(false);
</script>
