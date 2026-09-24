<template>
  <section class="panel" aria-labelledby="forms-title">
    <div class="section-heading">
      <h2 id="forms-title">Формы</h2>
      <span class="tag"
        >NuiField · NuiInput · NuiTextarea · NuiCheckbox · NuiRadio · NuiSwitch</span
      >
    </div>
    <form class="form" @submit.prevent="submitted++" @reset.prevent="reset">
      <NuiField label="Имя" description="Как к вам обращаться" required>
        <NuiInput
          v-model="name"
          data-testid="input-name"
          placeholder="Алексей"
          autocomplete="name"
        />
      </NuiField>
      <NuiField label="Почта" description="Рабочий адрес" :error="emailError">
        <NuiInput v-model.trim="email" type="email" data-testid="input-email" autocomplete="email">
          <template #prefix>@</template>
        </NuiInput>
      </NuiField>
      <NuiField label="Телефон" description="Маска +7 (###) ###-##-##, в модели только цифры">
        <NuiInput
          v-model.unmasked="phone"
          type="tel"
          mask="+7 (###) ###-##-##"
          data-testid="input-phone"
          autocomplete="tel"
        />
      </NuiField>
      <NuiField label="О себе">
        <NuiTextarea v-model="bio" data-testid="textarea-bio" />
      </NuiField>
      <NuiField label="Крупное поле">
        <NuiInput size="lg" data-testid="input-lg" />
      </NuiField>
      <NuiField label="Недоступное поле" disabled>
        <NuiInput model-value="Нельзя изменить" />
      </NuiField>
      <NuiCheckbox v-model="terms" data-testid="checkbox-terms">Принимаю условия</NuiCheckbox>
      <NuiCheckbox indeterminate data-testid="checkbox-indeterminate">Частично выбрано</NuiCheckbox>
      <NuiField group label="Каналы">
        <NuiCheckbox v-model="channels" value="email" data-testid="checkbox-channel-email"
          >Почта</NuiCheckbox
        >
        <NuiCheckbox v-model="channels" value="sms" data-testid="checkbox-channel-sms"
          >SMS</NuiCheckbox
        >
      </NuiField>
      <NuiField group label="Тариф" description="Можно изменить позже">
        <NuiRadioGroup v-model="plan" data-testid="radio-group">
          <NuiRadio value="free" data-testid="radio-free">Бесплатный</NuiRadio>
          <NuiRadio value="team" data-testid="radio-team">Команда</NuiRadio>
          <NuiRadio value="business" data-testid="radio-business">Бизнес</NuiRadio>
        </NuiRadioGroup>
      </NuiField>
      <NuiSwitch v-model="notifications" data-testid="switch-notifications">Уведомления</NuiSwitch>
      <div class="nui-flex nui-gap-2">
        <NuiButton type="submit" data-testid="submit">Отправить</NuiButton>
        <NuiButton type="reset" variant="ghost" tone="neutral">Сбросить</NuiButton>
      </div>
    </form>
    <pre class="output" data-testid="forms-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiButton,
  NuiCheckbox,
  NuiField,
  NuiInput,
  NuiRadio,
  NuiRadioGroup,
  NuiSwitch,
  NuiTextarea,
} from '@numior/vue';

const name = ref('');
const email = ref('');
const phone = ref('');
const bio = ref('');
const terms = ref(false);
const channels = ref<string[]>([]);
const plan = ref('free');
const notifications = ref(true);
const submitted = ref(0);

const emailError = computed(() =>
  email.value && !email.value.includes('@') ? 'Укажите адрес с символом @' : undefined,
);

const output = computed(() =>
  JSON.stringify(
    {
      name: name.value,
      email: email.value,
      phone: phone.value,
      bio: bio.value,
      terms: terms.value,
      channels: channels.value,
      plan: plan.value,
      notifications: notifications.value,
      submitted: submitted.value,
    },
    null,
    2,
  ),
);

const reset = () => {
  name.value = '';
  email.value = '';
  phone.value = '';
  bio.value = '';
  terms.value = false;
  channels.value = [];
  plan.value = 'free';
  notifications.value = true;
};
</script>
