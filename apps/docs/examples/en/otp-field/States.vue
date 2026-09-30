<template>
  <div class="flex flex-col gap-4">
    <NuiOtpField
      v-model="invite"
      label="Invitation code"
      :group-size="3"
      placeholder="○"
      size="lg"
    />
    <NuiOtpField model-value="482913" label="Email code" :group-size="3" readonly />
    <NuiOtpField model-value="48" label="Authenticator code" :group-size="3" disabled />
    <NuiOtpField
      v-model="expired"
      label="SMS code"
      :group-size="3"
      error="The code has expired, request a new one"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const invite = ref('');
const expired = ref('705118');
</script>
