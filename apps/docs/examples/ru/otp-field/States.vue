<template>
  <div class="flex flex-col gap-4">
    <NuiOtpField
      v-model="invite"
      label="Код приглашения"
      :group-size="3"
      placeholder="○"
      size="lg"
    />
    <NuiOtpField model-value="482913" label="Код из письма" :group-size="3" readonly />
    <NuiOtpField model-value="48" label="Код из приложения" :group-size="3" disabled />
    <NuiOtpField
      v-model="expired"
      label="Код из SMS"
      :group-size="3"
      error="Код устарел, запросите новый"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const invite = ref('');
const expired = ref('705118');
</script>
