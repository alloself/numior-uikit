<template>
  <NuiCheckbox v-model="terms" description="The order needs your consent" required>
    I accept the terms of use
  </NuiCheckbox>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckbox } from '@numior/vue';

const terms = ref(false);
</script>
