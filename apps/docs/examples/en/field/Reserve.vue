<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <NuiField label="Tracking number" :error="error" reserve-error>
      <NuiInput v-model="track" />
    </NuiField>
    <NuiButton class="self-start" @click="save">Save</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiField, NuiInput } from '@numior/kit';

const track = ref('');
const saved = ref(false);

const error = computed(() =>
  saved.value && track.value === '' ? 'Enter the tracking number from the waybill' : undefined,
);

const save = (): void => {
  saved.value = true;
};
</script>
