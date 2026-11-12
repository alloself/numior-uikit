<template>
  <NuiTooltip>
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        variant="ghost"
        tone="neutral"
        icon="refresh"
        aria-label="Refresh payment status"
        :loading="checking"
        @click="check"
      />
    </template>
    Asks the bank whether order 20411 is paid
  </NuiTooltip>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiButton, NuiTooltip } from '@numior/vue';

const checking = ref(false);

const check = async (): Promise<void> => {
  checking.value = true;
  await promiseTimeout(1500);
  checking.value = false;
};
</script>
