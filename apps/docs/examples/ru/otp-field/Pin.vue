<template>
  <NuiOtpField
    v-model="pin"
    label="PIN-код подарочной карты"
    description="Четыре цифры под защитным слоем"
    :length="4"
    secret
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiOtpField } from '@numior/vue';

const pin = ref('');
</script>
