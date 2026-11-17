<template>
  <div class="flex flex-col gap-2 max-w-sm">
    <NuiInput v-model="code" label="SMS code" inputmode="numeric" autocomplete="one-time-code" />
    <p class="text-sm text-muted-foreground">
      {{ supported ? 'Waiting for an SMS with the code' : 'This browser does not read SMS codes' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput, useWebOtp } from '@numior/kit';

const code = ref('');

const { supported } = useWebOtp({
  enabled: () => code.value === '',
  onCode: (received) => {
    code.value = received;
  },
});
</script>
