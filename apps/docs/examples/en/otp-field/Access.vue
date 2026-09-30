<template>
  <NuiOtpField
    v-model="code"
    label="Backup code"
    description="Eight characters from the recovery card"
    charset="alphanumeric"
    :length="8"
    :group-size="4"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const code = ref('');
</script>
