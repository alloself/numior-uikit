<template>
  <NuiOtpField
    v-model="pin"
    label="Gift card PIN"
    description="Four digits under the scratch-off strip"
    :length="4"
    secret
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const pin = ref('');
</script>
