<template>
  <div class="flex flex-col gap-3">
    <NuiOtpField
      v-model="code"
      label="Код из SMS"
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
import { NuiOtpField } from '@numior/vue';

type Check = 'waiting' | 'checking' | 'passed' | 'failed';

const SENT_CODE = '123456';
const sms = `${SENT_CODE} — код для входа в кабинет магазина.\n@example.com #${SENT_CODE}`;

const code = ref('');
const check = ref<Check>('waiting');

const description = computed(() =>
  check.value === 'passed' ? 'Телефон подтверждён' : 'Отправили на +7 900 000-01-01',
);

const error = computed(() =>
  check.value === 'failed' ? 'Неверный код, попробуйте ещё раз' : undefined,
);

const verify = async (value: string): Promise<void> => {
  check.value = 'checking';
  await promiseTimeout(600);
  check.value = value === SENT_CODE ? 'passed' : 'failed';

  if (check.value === 'failed') {
    code.value = '';
  }
};

watch(code, (value) => {
  if (check.value === 'failed' && value !== '') {
    check.value = 'waiting';
  }
});
</script>
