<template>
  <div class="flex flex-col items-center gap-3">
    <p class="m-0 text-sm">
      {{ cancelled ? 'Order 20411 is canceled.' : 'Order 20411 awaits payment.' }}
    </p>
    <NuiButton variant="outline" tone="error" :disabled="cancelled" @click="cancel">
      Cancel order
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, useToast } from '@numior/kit';

const toast = useToast();
const cancelled = ref(false);

const cancel = (): void => {
  cancelled.value = true;

  toast.show({
    title: 'Order 20411 canceled',
    description: 'Nina Hart gets an email',
    action: {
      label: 'Undo',
      onClick: () => {
        cancelled.value = false;
      },
    },
  });
};
</script>
