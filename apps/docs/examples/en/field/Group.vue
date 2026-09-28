<template>
  <NuiField group label="First and last name" description="As in the passport">
    <div class="flex gap-2">
      <NuiInput v-model="firstName" placeholder="Anna" autocomplete="given-name" />
      <NuiInput v-model="lastName" placeholder="Titova" autocomplete="family-name" />
    </div>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput } from '@numior/vue';

const firstName = ref('');
const lastName = ref('');
</script>
