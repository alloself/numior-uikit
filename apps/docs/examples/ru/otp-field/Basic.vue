<template>
  <NuiOtpField
    v-model="code"
    label="Код из SMS"
    description="Отправили на +7 912 345-67-89"
    :group-size="3"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const code = ref('');
</script>
