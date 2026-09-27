<template>
  <NuiInput
    v-model.lazy.trim="city"
    label="City"
    :description="`Saved: ${city || '—'}`"
    placeholder="Lisbon"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const city = ref('');
</script>
