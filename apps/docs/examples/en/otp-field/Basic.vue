<template>
  <NuiOtpField
    v-model="code"
    label="SMS code"
    description="Sent to +44 7700 900123"
    :group-size="3"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const code = ref('');
</script>
