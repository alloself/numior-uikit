<template>
  <NuiOtpField
    v-model="code"
    label="Code from the email"
    description="Sent to peter.wolfe@example.com"
    :group-size="3"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const code = ref('');
</script>
