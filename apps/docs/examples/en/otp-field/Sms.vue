<template>
  <div class="flex flex-col items-start gap-2">
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
    <NuiButton variant="ghost" size="sm" :disabled="secondsLeft > 0" @click="resend">
      {{ secondsLeft > 0 ? `Send again in ${secondsLeft} s` : 'Send again' }}
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NuiButton, NuiOtpField } from '@numior/vue';

type Check = 'waiting' | 'checking' | 'passed' | 'failed';

const code = ref('');
const check = ref<Check>('waiting');
const secondsLeft = ref(30);
const timers: { countdown?: ReturnType<typeof setInterval> } = {};

const description = computed(() =>
  check.value === 'passed' ? 'Phone number confirmed' : 'The code 123456 works',
);

const error = computed(() =>
  check.value === 'failed' ? 'The code is wrong, please try again' : undefined,
);

const countDown = (): void => {
  clearInterval(timers.countdown);
  secondsLeft.value = 30;

  timers.countdown = setInterval(() => {
    secondsLeft.value = Math.max(0, secondsLeft.value - 1);
  }, 1000);
};

const verify = async (value: string): Promise<void> => {
  check.value = 'checking';
  await new Promise((resolve) => setTimeout(resolve, 600));
  check.value = value === '123456' ? 'passed' : 'failed';
  if (check.value === 'failed') {
    code.value = '';
  }
};

const resend = (): void => {
  code.value = '';
  check.value = 'waiting';
  countDown();
};

watch(code, (value) => {
  if (check.value === 'failed' && value !== '') {
    check.value = 'waiting';
  }
});

onMounted(countDown);
onBeforeUnmount(() => clearInterval(timers.countdown));
</script>
