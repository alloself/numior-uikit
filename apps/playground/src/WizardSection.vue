<template>
  <section class="panel" aria-labelledby="wizard-title">
    <div class="section-heading">
      <h2 id="wizard-title">Мастер</h2>
      <span class="tag">NuiSmartForm · steps · NuiStepper</span>
    </div>
    <p class="wizard-demo__note">
      Сервер отклоняет адрес taken@example.com — мастер вернётся к первому шагу.
    </p>
    <NuiSmartForm
      v-model:step="step"
      :form="form"
      :steps="STEPS"
      submit-label="Создать команду"
      class="wizard-demo"
      aria-label="Создание команды"
      data-testid="wizard-form"
    >
      <template #rules>Согласен с правилами команды</template>
    </NuiSmartForm>
    <pre class="output" data-testid="wizard-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiCheckbox,
  NuiInput,
  NuiNumberField,
  NuiSelect,
  type NuiOptionSource,
} from '@numior/vue';
import {
  NuiFormError,
  NuiSmartForm,
  email,
  formConfig,
  min,
  required,
  useForm,
  type NuiSmartFormStep,
} from '@numior/forms';

interface Onboarding {
  email: string;
  password: string;
  team: string;
  size: number | null;
  role: string;
  rules: boolean;
}

const TAKEN = 'taken@example.com';

const ROLES: NuiOptionSource<string> = [
  { value: 'owner', label: 'Владелец' },
  { value: 'admin', label: 'Администратор' },
  { value: 'member', label: 'Участник' },
];

const { field } = formConfig<Onboarding>();

const STEPS: NuiSmartFormStep<Onboarding>[] = [
  {
    value: 'account',
    label: 'Аккаунт',
    description: 'Почта и пароль',
    fields: [
      field(NuiInput, (v) => v.email, {
        label: 'Почта',
        required: true,
        rules: [required(), email()],
        props: { type: 'email', autocomplete: 'email' },
      }),
      field(NuiInput, (v) => v.password, {
        label: 'Пароль',
        description: 'Не короче 8 символов',
        required: true,
        rules: [required(), min(8)],
        props: { type: 'password', autocomplete: 'new-password' },
      }),
    ],
  },
  {
    value: 'team',
    label: 'Команда',
    description: 'Название и роль',
    layout: '"team team" "size role"',
    fields: [
      field(NuiInput, (v) => v.team, {
        label: 'Название команды',
        required: true,
        rules: [required()],
      }),
      field(NuiNumberField, (v) => v.size, {
        label: 'Сколько человек',
        props: { min: 1, max: 500 },
      }),
      field(NuiSelect, (v) => v.role, { label: 'Ваша роль', props: { options: ROLES } }),
    ],
  },
  {
    value: 'confirm',
    label: 'Подтверждение',
    fields: [
      field(NuiCheckbox, (v) => v.rules, {
        rules: [required({ message: 'Подтвердите согласие с правилами' })],
      }),
    ],
  },
];

const step = ref<string>();
const submitted = ref(0);
const created = ref<string | null>(null);

const form = useForm<Onboarding>({
  initialValues: {
    email: '',
    password: '',
    team: '',
    size: 5,
    role: 'owner',
    rules: false,
  },
  onSubmit: async (values) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 400);
    });

    if (values.email?.trim() === TAKEN) {
      throw new NuiFormError({ email: 'Этот адрес уже зарегистрирован' });
    }
    submitted.value += 1;
    created.value = values.team ?? null;
  },
});

const output = computed(() =>
  JSON.stringify(
    { step: step.value ?? 'account', submitted: submitted.value, team: created.value },
    null,
    2,
  ),
);
</script>
