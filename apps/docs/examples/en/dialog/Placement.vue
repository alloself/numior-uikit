<template>
  <NuiButton variant="outline" @click="open = true">New product</NuiButton>
  <NuiDialog v-model:open="open" placement="top" size="lg" title="New product">
    <div class="flex flex-col gap-3">
      <NuiInput v-model="name" label="Name" placeholder="Bergen chair" />
      <NuiTextarea v-model="details" label="Description" :rows="3" />
      <NuiSwitch v-model="custom">Made to order</NuiSwitch>
      <NuiNumberField v-if="custom" v-model="days" label="Lead time, days" :min="1" />
    </div>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Cancel</NuiButton>
      <NuiButton @click="open = false">Create</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiDialog,
  NuiInput,
  NuiNumberField,
  NuiSwitch,
  NuiTextarea,
} from '@numior/kit';

const open = ref(false);
const name = ref('');
const details = ref('');
const custom = ref(false);
const days = ref<number | null>(14);
</script>
