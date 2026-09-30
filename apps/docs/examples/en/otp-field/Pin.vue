<template>
  <NuiOtpField
    v-model="pin"
    label="Card PIN"
    description="Four digits from the envelope"
    :length="4"
    secret
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const pin = ref('');
</script>
