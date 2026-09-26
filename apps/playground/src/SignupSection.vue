<template>
  <section class="panel" aria-labelledby="signup-title">
    <div class="section-heading">
      <h2 id="signup-title">Регистрация</h2>
      <span class="tag">NuiForm · NuiFormField · useForm</span>
    </div>
    <div class="form-demo__options">
      <NuiField label="Ответ сервера" class="form-demo__server">
        <NuiSelect v-model="server" :options="SERVER_OPTIONS" data-testid="signup-server" />
      </NuiField>
      <NuiSwitch v-model="reserveError" data-testid="signup-reserve">Место под ошибки</NuiSwitch>
    </div>
    <NuiForm :form="form" :reserve-error="reserveError" class="form-demo" data-testid="signup-form">
      <NuiFormField
        v-slot="{ field, pending }"
        :form="form"
        :name="(v) => v.login"
        label="Логин"
        description="Проверяем, свободен ли он, когда вы уходите из поля"
        validate-on="blur"
        :rules="loginRules"
        required
      >
        <NuiInput v-bind="field" data-testid="signup-login" autocomplete="username">
          <template #suffix>
            <NuiIcon v-if="pending" alias="loader" class="form-demo__spinner" />
          </template>
        </NuiInput>
      </NuiFormField>
      <NuiFormField
        v-slot="{ field }"
        :form="form"
        :name="(v) => v.email"
        label="Почта"
        :rules="emailRules"
        required
      >
        <NuiInput v-bind="field" type="email" data-testid="signup-email" autocomplete="email" />
      </NuiFormField>
      <div class="form-demo__pair">
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.password"
          label="Пароль"
          description="Не короче 8 символов"
          :rules="passwordRules"
          required
        >
          <NuiInput
            v-bind="field"
            type="password"
            data-testid="signup-password"
            autocomplete="new-password"
          />
        </NuiFormField>
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.confirm"
          label="Повтор пароля"
          required
        >
          <NuiInput
            v-bind="field"
            type="password"
            data-testid="signup-confirm"
            autocomplete="new-password"
          />
        </NuiFormField>
      </div>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.plan" label="Тариф" group>
        <NuiRadioGroup v-bind="field" data-testid="signup-plan">
          <NuiRadio value="free">Бесплатный</NuiRadio>
          <NuiRadio value="team">Команда</NuiRadio>
          <NuiRadio value="business">Бизнес</NuiRadio>
        </NuiRadioGroup>
      </NuiFormField>
      <div class="form-demo__pair">
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.birthday"
          label="Дата рождения"
        >
          <NuiDatePicker v-bind="field" data-testid="signup-birthday" />
        </NuiFormField>
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.seats"
          label="Места в команде"
        >
          <NuiNumberField v-bind="field" :min="1" :max="50" data-testid="signup-seats" />
        </NuiFormField>
      </div>
      <NuiFormField
        v-slot="{ value, setValue }"
        :form="form"
        :name="(v) => v.tags"
        label="Интересы"
        description="Можно выбрать из списка или добавить свой"
      >
        <NuiCombobox
          :values="value"
          multiple
          :options="TAG_OPTIONS"
          :custom-value="asTag"
          data-testid="signup-tags"
          @update:values="setValue"
        />
      </NuiFormField>
      <NuiFormField
        v-slot="{ field }"
        :form="form"
        :name="(v) => v.call"
        label="Удобное время звонка"
      >
        <NuiTimeField v-bind="field" data-testid="signup-call" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.terms" :rules="termsRules">
        <NuiCheckbox v-bind="field" data-testid="signup-terms"
          >Принимаю условия сервиса</NuiCheckbox
        >
      </NuiFormField>
      <template #actions="{ pending, dirty, reset }">
        <NuiButton type="submit" :loading="pending" data-testid="signup-submit">
          Создать аккаунт
        </NuiButton>
        <NuiButton
          variant="ghost"
          tone="neutral"
          :disabled="!dirty || pending"
          data-testid="signup-reset"
          @click="reset"
        >
          Сбросить
        </NuiButton>
      </template>
    </NuiForm>
    <pre class="output" data-testid="signup-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiButton,
  NuiCheckbox,
  NuiCombobox,
  NuiDatePicker,
  NuiField,
  NuiIcon,
  NuiInput,
  NuiNumberField,
  NuiRadio,
  NuiRadioGroup,
  NuiSelect,
  NuiSwitch,
  NuiTimeField,
  type NuiOptionSource,
} from '@numior/vue';
import {
  NuiForm,
  NuiFormError,
  NuiFormField,
  customAsync,
  email,
  min,
  required,
  useForm,
  type FieldRule,
  type SubmittedValues,
} from '@numior/forms';

interface Signup {
  login: string;
  email: string;
  password: string;
  confirm: string;
  plan: string;
  birthday: string | null;
  seats: number | null;
  tags: string[];
  call: string | null;
  terms: boolean;
}

type ServerMode = 'ok' | 'field' | 'form' | 'slow';

const SERVER_OPTIONS: NuiOptionSource<ServerMode> = [
  { value: 'ok', label: 'Успех' },
  { value: 'field', label: 'Ошибка поля' },
  { value: 'form', label: 'Ошибка формы' },
  { value: 'slow', label: 'Медленный ответ' },
];

const TAG_OPTIONS: NuiOptionSource<string> = [
  { value: 'design', label: 'Дизайн' },
  { value: 'frontend', label: 'Фронтенд' },
  { value: 'backend', label: 'Бэкенд' },
];

const TAKEN = ['admin', 'numior'];

const pause = (milliseconds: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

const asTag = (text: string): string => text;

const matchesPassword: FieldRule<unknown, Signup> = (value, { values }) =>
  value === values.password || 'Пароли не совпадают';

const loginRules = [
  required(),
  min(3),
  customAsync(async (value, { signal }) => {
    await pause(400, signal);
    return typeof value === 'string' && TAKEN.includes(value) ? 'Этот логин уже занят' : undefined;
  }),
];

const emailRules = [required(), email()];
const passwordRules = [required(), min(8)];
const termsRules = [required({ message: 'Нужно принять условия' })];

const server = ref<ServerMode>('ok');
const reserveError = ref(false);
const submitted = ref(0);
type Delivered = Pick<SubmittedValues<Signup>, 'seats' | 'tags'>;

const deliveredOf = (values: SubmittedValues<Signup>): Delivered => ({
  seats: values.seats ?? null,
  tags: values.tags ?? [],
});

const delivered = ref<Delivered>({ seats: null, tags: [] });

const form = useForm<Signup>({
  initialValues: {
    login: '',
    email: '',
    password: '',
    confirm: '',
    plan: 'free',
    birthday: null,
    seats: 1,
    tags: [],
    call: null,
    terms: false,
  },
  rules: { confirm: [required(), matchesPassword] },
  onSubmit: async (values) => {
    await pause(server.value === 'slow' ? 1500 : 300);

    if (server.value === 'field') {
      throw new NuiFormError({ email: 'Этот адрес уже зарегистрирован' });
    }
    if (server.value === 'form') {
      throw new NuiFormError({}, 'Сервис регистрации временно недоступен');
    }
    submitted.value += 1;
    delivered.value = deliveredOf(values);
  },
});

const output = computed(() =>
  JSON.stringify(
    {
      submitted: submitted.value,
      submitCount: form.meta.value.submitCount,
      dirty: form.meta.value.dirty,
      pending: form.meta.value.pending,
      formErrors: form.formErrors.value.map((error) => error.message),
      seats: delivered.value.seats,
      tags: delivered.value.tags,
    },
    null,
    2,
  ),
);
</script>
