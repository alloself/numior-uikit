<template>
  <NuiOtpField
    v-model="code"
    label="Код из письма"
    description="Отправили на volkov@example.com"
    :group-size="3"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/kit';

const code = ref('');
</script>
