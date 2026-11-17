<template>
  <div class="flex flex-col gap-3">
    <NuiOtpField
      v-model="code"
      label="SMS code"
      :description="description"
      :error="error"
      :group-size="3"
      :readonly="check === 'checking'"
      web-otp
      @complete="verify"
    />
    <p class="m-0 rounded-md bg-surface-muted px-3 py-2 text-sm whitespace-pre-line">
      {{ sms }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiOtpField } from '@numior/kit';

type Check = 'waiting' | 'checking' | 'passed' | 'failed';

const SENT_CODE = '123456';
const sms = `${SENT_CODE} is your code to sign in to the store dashboard.\n@example.com #${SENT_CODE}`;

const code = ref('');
const check = ref<Check>('waiting');

const description = computed(() =>
  check.value === 'passed' ? 'Phone number confirmed' : 'Sent to (617) 555-0101',
);

const error = computed(() =>
  check.value === 'failed' ? 'Wrong code, please try again' : undefined,
);

const verify = async (value: string): Promise<void> => {
  check.value = 'checking';
  await promiseTimeout(600);
  check.value = value === SENT_CODE ? 'passed' : 'failed';

  if (check.value !== 'failed') {
    return;
  }

  code.value = '';
};

watch(code, (value) => {
  if (check.value !== 'failed' || value === '') {
    return;
  }

  check.value = 'waiting';
});
</script>
