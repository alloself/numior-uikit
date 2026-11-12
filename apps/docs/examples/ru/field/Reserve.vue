<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <NuiField label="Трек-номер" :error="error" reserve-error>
      <NuiInput v-model="track" />
    </NuiField>
    <NuiButton class="self-start" @click="save">Сохранить</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiField, NuiInput } from '@numior/vue';

const track = ref('');
const saved = ref(false);

const error = computed(() =>
  saved.value && track.value === '' ? 'Укажите трек-номер из накладной' : undefined,
);

const save = (): void => {
  saved.value = true;
};
</script>
