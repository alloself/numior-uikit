<template>
  <NuiCheckbox v-model="agreed" description="The order cannot be placed without it" required>
    I agree to the delivery terms
  </NuiCheckbox>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckbox } from '@numior/vue';

const agreed = ref(false);
</script>
