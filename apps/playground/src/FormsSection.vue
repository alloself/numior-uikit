<template>
  <section class="panel" aria-labelledby="forms-title">
    <div class="section-heading">
      <h2 id="forms-title">Формы</h2>
      <span class="tag"
        >NuiField · NuiInput · NuiTextarea · NuiCheckbox · NuiRadio · NuiSwitch</span
      >
    </div>
    <form class="form" @submit.prevent="submitted++" @reset.prevent="reset">
      <NuiInput
        v-model="name"
        label="Имя"
        description="Как к вам обращаться"
        required
        data-testid="input-name"
        placeholder="Алексей"
        autocomplete="name"
      />
      <NuiInput
        v-model.trim="email"
        type="email"
        label="Почта"
        description="Рабочий адрес"
        :error="emailError"
        data-testid="input-email"
        autocomplete="email"
      >
        <template #prefix>@</template>
      </NuiInput>
      <NuiInput
        v-model.unmasked="phone"
        type="tel"
        mask="+7 (###) ###-##-##"
        label="Телефон"
        description="Маска +7 (###) ###-##-##, в модели только цифры"
        data-testid="input-phone"
        autocomplete="tel"
      />
      <NuiTextarea v-model="bio" label="О себе" data-testid="textarea-bio" />
      <NuiInput size="lg" label="Крупное поле" data-testid="input-lg" />
      <NuiInput model-value="Нельзя изменить" label="Недоступное поле" disabled />
      <NuiCheckbox v-model="terms" data-testid="checkbox-terms">Принимаю условия</NuiCheckbox>
      <NuiCheckbox indeterminate data-testid="checkbox-indeterminate">Частично выбрано</NuiCheckbox>
      <NuiCheckboxGroup
        v-model="channels"
        :options="CHANNELS"
        label="Каналы"
        orientation="horizontal"
        data-testid="checkbox-channels"
      />
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
  NuiCheckboxGroup,
  NuiField,
  NuiInput,
  NuiRadio,
  NuiRadioGroup,
  NuiSwitch,
  NuiTextarea,
  type NuiOption,
} from '@numior/vue';

const CHANNELS: readonly NuiOption<string>[] = [
  { value: 'email', label: 'Почта' },
  { value: 'sms', label: 'SMS' },
];

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
