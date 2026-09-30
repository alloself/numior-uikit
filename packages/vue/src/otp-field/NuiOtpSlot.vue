<template>
  <span
    class="nui-otp-field__slot"
    :class="{
      'nui-otp-field__slot--active': active,
      'nui-otp-field__slot--revealed': revealed,
    }"
  >
    <template v-if="char !== undefined">
      <span :key="char" class="nui-otp-field__char">{{ char }}</span>
      <span v-if="secret" class="nui-otp-field__dot" />
    </template>
    <span v-else-if="caret" class="nui-otp-field__caret" />
    <span v-else-if="placeholder" class="nui-otp-field__placeholder">{{ placeholder }}</span>
  </span>
</template>

<script setup lang="ts">
import type { NuiOtpSlotProps } from './otp-field.types';

const { char, active, revealed, caret, secret, placeholder } = defineProps<NuiOtpSlotProps>();
</script>
