<template>
  <section class="panel" aria-labelledby="smart-title">
    <div class="section-heading">
      <h2 id="smart-title">Умная форма</h2>
      <span class="tag">NuiSmartForm · formConfig</span>
    </div>
    <NuiSmartForm
      :form="filter"
      :fields="FILTER_FIELDS"
      inline="grow"
      submit-label="Найти"
      class="smart-demo__filter"
      aria-label="Фильтр"
      data-testid="smart-filter"
    />
    <NuiSwitch v-model="profileReadonly" data-testid="smart-readonly">Только чтение</NuiSwitch>
    <NuiSmartForm
      :form="profile"
      :fields="PROFILE_FIELDS"
      :readonly="profileReadonly"
      submit-label="Сохранить профиль"
      class="smart-demo"
      aria-label="Профиль"
      data-testid="smart-profile"
    >
      <template #kind>
        <NuiRadio value="person">Частное лицо</NuiRadio>
        <NuiRadio value="company">Компания</NuiRadio>
      </template>
      <template #[ABOUT_AFTER]>
        <p class="smart-demo__counter" data-testid="smart-about-counter">
          {{ aboutLength }} / {{ ABOUT_LIMIT }}
        </p>
      </template>
      <template #newsletter>Присылать новости раз в месяц</template>
    </NuiSmartForm>
    <NuiSmartForm
      :form="lead"
      :fields="leadFields"
      submit-label="Отправить заявку"
      class="smart-demo"
      aria-label="Заявка"
      data-testid="smart-json"
    />
    <pre class="output" data-testid="smart-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiCheckbox,
  NuiInput,
  NuiRadio,
  NuiRadioGroup,
  NuiSelect,
  NuiSwitch,
  NuiTextarea,
  type NuiOptionSource,
} from '@numior/vue';
import { kitControls } from '@numior/vue/controls';
import {
  NuiSmartForm,
  email,
  formConfig,
  max,
  parseFormConfig,
  pattern,
  required,
  useForm,
  type FormJsonEntry,
  type SubmittedValues,
} from '@numior/forms';

interface Contact {
  name: string;
  phone: string;
}

interface Profile {
  kind: 'person' | 'company';
  name: string;
  email: string;
  company: string;
  vat: string;
  country: string | null;
  city: string;
  contacts: Contact[];
  about: string;
  newsletter: boolean;
}

interface Lead {
  kind: string;
  name: string;
  company: string;
  budget: number | null;
  agree: boolean;
}

interface Filter {
  query: string;
  status: string | null;
}

const ABOUT_LIMIT = 280;

const ABOUT_AFTER = 'about:after';

const COUNTRIES: NuiOptionSource<string> = [
  { value: 'ru', label: 'Россия' },
  { value: 'kz', label: 'Казахстан' },
  { value: 'am', label: 'Армения' },
  { value: 'rs', label: 'Сербия' },
];

const STATUSES: NuiOptionSource<string> = [
  { value: 'active', label: 'Активные' },
  { value: 'invited', label: 'Приглашённые' },
  { value: 'blocked', label: 'Заблокированные' },
];

const { field, section, array } = formConfig<Profile>();
const contact = formConfig<Contact>();
const filterConfig = formConfig<Filter>();

const isCompany = (values: Profile): boolean => values.kind === 'company';

const PROFILE_FIELDS = [
  section({
    title: 'Профиль',
    description: 'Как к вам обращаться и куда писать',
    layout: '"kind kind" "name email" "company vat"',
    fields: [
      field(NuiRadioGroup, (v) => v.kind, {
        label: 'Тип аккаунта',
        group: true,
        props: { orientation: 'horizontal' },
      }),
      field(NuiInput, (v) => v.name, {
        label: 'Имя',
        required: true,
        rules: [required()],
        props: { autocomplete: 'name' },
      }),
      field(NuiInput, (v) => v.email, {
        label: 'Почта',
        required: true,
        rules: [required(), email()],
        props: { type: 'email', autocomplete: 'email' },
      }),
      field(NuiInput, (v) => v.company, {
        label: 'Компания',
        required: true,
        when: isCompany,
        rules: [required()],
        props: { autocomplete: 'organization' },
      }),
      field(NuiInput, (v) => v.vat, {
        label: 'ИНН',
        description: '10 цифр',
        when: isCompany,
        rules: [pattern(/^\d{10}$/, { message: 'ИНН состоит из 10 цифр' })],
        props: { inputmode: 'numeric' },
      }),
    ],
  }),
  section({
    title: 'Адрес',
    layout: '"country city"',
    fields: [
      field(NuiSelect, (v) => v.country, {
        label: 'Страна',
        props: { options: COUNTRIES, placeholder: 'Выберите страну' },
      }),
      field(NuiInput, (v) => v.city, { label: 'Город', props: { autocomplete: 'address-level2' } }),
    ],
  }),
  section({
    title: 'Контактные лица',
    description: 'От одного до трёх, порядок можно менять',
    fields: [
      array((v) => v.contacts, {
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        addLabel: 'Добавить контакт',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          contact.field(NuiInput, (row) => row.name, {
            label: 'Имя',
            required: true,
            rules: [required()],
          }),
          contact.field(NuiInput, (row) => row.phone, {
            label: 'Телефон',
            props: { type: 'tel', mask: '+7 (###) ###-##-##' },
          }),
        ],
      }),
    ],
  }),
  section({
    title: 'Дополнительно',
    fields: [
      field(NuiTextarea, (v) => v.about, {
        label: 'О себе',
        rules: [max(ABOUT_LIMIT)],
        props: { rows: 3 },
      }),
      field(NuiCheckbox, (v) => v.newsletter),
    ],
  }),
];

const FILTER_FIELDS = [
  filterConfig.field(NuiInput, (v) => v.query, {
    label: 'Поиск',
    props: { type: 'search', placeholder: 'Имя или почта' },
  }),
  filterConfig.field(NuiSelect, (v) => v.status, {
    label: 'Статус',
    props: { options: STATUSES, placeholder: 'Любой' },
  }),
];

const LEAD_CONFIG: readonly FormJsonEntry[] = [
  {
    kind: 'section',
    title: 'Заявка из JSON',
    description: 'Конфигурация пришла с сервера и прошла через реестр контролов',
    layout: '"kind kind" "name company" "budget agree"',
    fields: [
      {
        kind: 'field',
        type: 'radio',
        name: 'kind',
        label: 'Кто вы',
        group: true,
        props: {
          orientation: 'horizontal',
          options: [
            { value: 'person', label: 'Частное лицо' },
            { value: 'company', label: 'Компания' },
          ],
        },
      },
      {
        kind: 'field',
        type: 'text',
        name: 'name',
        label: 'Имя',
        required: true,
        rules: [{ rule: 'required' }],
      },
      {
        kind: 'field',
        type: 'text',
        name: 'company',
        label: 'Компания',
        required: true,
        when: { path: 'kind', equals: 'company' },
        rules: [{ rule: 'required' }],
      },
      {
        kind: 'field',
        type: 'number',
        name: 'budget',
        label: 'Бюджет',
        props: { min: 0, step: 1000 },
      },
      {
        kind: 'field',
        type: 'switch',
        name: 'agree',
        props: { label: 'Согласен на обработку данных' },
      },
    ],
  },
];

const parsedLead = parseFormConfig<Lead>(LEAD_CONFIG, { controls: kitControls });
const leadFields = parsedLead.kind === 'ok' ? parsedLead.fields : [];
const leadIssues = parsedLead.kind === 'error' ? parsedLead.issues : [];
const leadSaved = ref<SubmittedValues<Lead> | null>(null);

const applied = ref<SubmittedValues<Filter>>({ query: '', status: null });
const saved = ref<SubmittedValues<Profile> | null>(null);
const profileReadonly = ref(false);

const filter = useForm<Filter>({
  initialValues: { query: '', status: null },
  onSubmit: (values) => {
    applied.value = values;
  },
});

const lead = useForm<Lead>({
  initialValues: { kind: 'person', name: '', company: '', budget: null, agree: false },
  onSubmit: (values) => {
    leadSaved.value = values;
  },
});

const profile = useForm<Profile>({
  initialValues: {
    kind: 'person',
    name: '',
    email: '',
    company: '',
    vat: '',
    country: null,
    city: '',
    contacts: [{ name: '', phone: '' }],
    about: '',
    newsletter: false,
  },
  onSubmit: (values) => {
    saved.value = values;
  },
});

const aboutLength = computed(() => [...profile.values.about].length);

const output = computed(() =>
  JSON.stringify(
    { filter: applied.value, profile: saved.value, lead: leadSaved.value, issues: leadIssues },
    null,
    2,
  ),
);
</script>
