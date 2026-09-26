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
    <NuiSmartForm
      :form="profile"
      :fields="PROFILE_FIELDS"
      submit-label="Сохранить профиль"
      class="smart-demo"
      aria-label="Профиль"
      data-testid="smart-profile"
    >
      <template #kind="{ field }">
        <NuiRadioGroup v-bind="field" orientation="horizontal">
          <NuiRadio value="person">Частное лицо</NuiRadio>
          <NuiRadio value="company">Компания</NuiRadio>
        </NuiRadioGroup>
      </template>
      <template #[ABOUT_AFTER]>
        <p class="smart-demo__counter" data-testid="smart-about-counter">
          {{ aboutLength }} / {{ ABOUT_LIMIT }}
        </p>
      </template>
      <template #newsletter="{ field }">
        <NuiCheckbox v-bind="field">Присылать новости раз в месяц</NuiCheckbox>
      </template>
    </NuiSmartForm>
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
  NuiTextarea,
  type NuiOptionSource,
} from '@numior/vue';
import { NuiSmartForm, email, formConfig, max, pattern, required, useForm } from '@numior/forms';

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
      field(NuiRadioGroup, { name: 'kind', label: 'Тип аккаунта', group: true }),
      field(NuiInput, {
        name: 'name',
        label: 'Имя',
        required: true,
        rules: [required()],
        props: { autocomplete: 'name' },
      }),
      field(NuiInput, {
        name: 'email',
        label: 'Почта',
        required: true,
        rules: [required(), email()],
        props: { type: 'email', autocomplete: 'email' },
      }),
      field(NuiInput, {
        name: 'company',
        label: 'Компания',
        required: true,
        when: isCompany,
        rules: [required()],
        props: { autocomplete: 'organization' },
      }),
      field(NuiInput, {
        name: 'vat',
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
      field(NuiSelect, {
        name: 'country',
        label: 'Страна',
        props: { options: COUNTRIES, placeholder: 'Выберите страну' },
      }),
      field(NuiInput, { name: 'city', label: 'Город', props: { autocomplete: 'address-level2' } }),
    ],
  }),
  section({
    title: 'Контактные лица',
    description: 'От одного до трёх, порядок можно менять',
    fields: [
      array({
        name: 'contacts',
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        addLabel: 'Добавить контакт',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          contact.field(NuiInput, {
            name: 'name',
            label: 'Имя',
            required: true,
            rules: [required()],
          }),
          contact.field(NuiInput, {
            name: 'phone',
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
      field(NuiTextarea, {
        name: 'about',
        label: 'О себе',
        rules: [max(ABOUT_LIMIT)],
        props: { rows: 3 },
      }),
      field(NuiCheckbox, { name: 'newsletter' }),
    ],
  }),
];

const FILTER_FIELDS = [
  filterConfig.field(NuiInput, {
    name: 'query',
    label: 'Поиск',
    props: { type: 'search', placeholder: 'Имя или почта' },
  }),
  filterConfig.field(NuiSelect, {
    name: 'status',
    label: 'Статус',
    props: { options: STATUSES, placeholder: 'Любой' },
  }),
];

const applied = ref<Filter>({ query: '', status: null });
const saved = ref<Partial<Profile> | null>(null);

const filter = useForm<Filter>({
  initialValues: { query: '', status: null },
  onSubmit: (values) => {
    applied.value = values;
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
  JSON.stringify({ filter: applied.value, profile: saved.value }, null, 2),
);
</script>
