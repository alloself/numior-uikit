<template>
  <section class="panel" aria-labelledby="otp-title">
    <div class="section-heading">
      <h2 id="otp-title">Код подтверждения</h2>
      <span class="tag">NuiOtpField</span>
    </div>
    <div class="form">
      <div class="otp-demo__sms">
        <NuiOtpField
          v-model="sms"
          label="Код из SMS"
          :description="smsDescription"
          :error="smsError"
          :group-size="3"
          :readonly="state === 'checking'"
          web-otp
          data-testid="otp-sms"
          @complete="verify"
        />
        <NuiButton
          variant="ghost"
          size="sm"
          class="otp-demo__resend"
          :disabled="secondsLeft > 0"
          data-testid="otp-resend"
          @click="resend"
        >
          {{ resendText }}
        </NuiButton>
      </div>
      <NuiOtpField
        v-model="access"
        label="Код доступа"
        description="Восемь символов: латиница и цифры"
        charset="alphanumeric"
        :length="8"
        :group-size="4"
        data-testid="otp-access"
      />
      <NuiOtpField
        v-model="pin"
        label="PIN"
        description="Цифры скрыты, последняя видна секунду"
        :length="4"
        secret
        data-testid="otp-pin"
      />
      <NuiOtpField
        v-model="spare"
        label="Резервный код"
        description="Крупный размер и плейсхолдер в пустых ячейках"
        :group-size="2"
        placeholder="○"
        size="lg"
        data-testid="otp-spare"
      />
      <NuiOtpField
        model-value="4829"
        label="Только чтение"
        :length="4"
        size="sm"
        readonly
        data-testid="otp-readonly"
      />
      <NuiOtpField
        model-value="48"
        label="Недоступно"
        :length="4"
        disabled
        data-testid="otp-disabled"
      />
    </div>
    <pre class="output" data-testid="otp-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NuiButton, NuiOtpField } from '@numior/vue';

type SmsState = 'waiting' | 'checking' | 'passed' | 'failed';

const RIGHT_CODE = '123456';
const RESEND_DELAY = 30;
const CHECK_DELAY = 600;

const sms = ref('');
const state = ref<SmsState>('waiting');
const completed = ref<string[]>([]);
const secondsLeft = ref(RESEND_DELAY);
const access = ref('');
const pin = ref('');
const spare = ref('');
const timers: { countdown?: ReturnType<typeof setInterval> } = {};

const smsDescription = computed(() =>
  state.value === 'passed' ? 'Код подтверждён' : `Верный код — ${RIGHT_CODE}`,
);

const smsError = computed(() =>
  state.value === 'failed' ? 'Неверный код, попробуйте ещё раз' : undefined,
);

const resendText = computed(() =>
  secondsLeft.value > 0 ? `Отправить ещё раз через ${secondsLeft.value} с` : 'Отправить ещё раз',
);

const tick = (): void => {
  secondsLeft.value = Math.max(0, secondsLeft.value - 1);
};

const startCountdown = (): void => {
  clearInterval(timers.countdown);
  secondsLeft.value = RESEND_DELAY;
  timers.countdown = setInterval(tick, 1000);
};

const verify = (code: string): void => {
  completed.value = [...completed.value, code];
  state.value = 'checking';

  setTimeout(() => {
    state.value = code === RIGHT_CODE ? 'passed' : 'failed';
    if (state.value !== 'failed') {
      return;
    }

    sms.value = '';
  }, CHECK_DELAY);
};

const resend = (): void => {
  sms.value = '';
  state.value = 'waiting';
  startCountdown();
};

const output = computed(() =>
  JSON.stringify(
    {
      sms: sms.value,
      state: state.value,
      completed: completed.value,
      access: access.value,
      pin: pin.value,
      spare: spare.value,
    },
    null,
    2,
  ),
);

watch(sms, (value) => {
  if (state.value !== 'failed' || value === '') {
    return;
  }

  state.value = 'waiting';
});

onMounted(startCountdown);
onBeforeUnmount(() => clearInterval(timers.countdown));
</script>
