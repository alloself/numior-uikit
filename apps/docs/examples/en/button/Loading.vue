<template>
  <NuiButton :loading="sending" @click="send">Place order</NuiButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiButton } from '@numior/kit';

const sending = ref(false);

const send = async (): Promise<void> => {
  sending.value = true;
  await promiseTimeout(1500);
  sending.value = false;
};
</script>
