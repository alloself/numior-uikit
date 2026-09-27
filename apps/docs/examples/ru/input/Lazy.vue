<template>
  <NuiInput
    v-model.lazy.trim="city"
    label="Город"
    :description="`Сохранено: ${city || '—'}`"
    placeholder="Казань"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const city = ref('');
</script>
