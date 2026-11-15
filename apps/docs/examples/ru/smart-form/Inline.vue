<template>
  <NuiSmartForm :form="form" :fields="fields" inline submit-label="Показать" />
</template>

<script setup lang="ts">
import { NuiInput, NuiSelect } from '@numior/vue';
import { NuiSmartForm, formConfig, useForm } from '@numior/forms';

interface Filters {
  query: string;
  status: string | null;
}

const { field } = formConfig<Filters>();

const statuses = [
  { value: 'paid', label: 'Оплачен' },
  { value: 'pending', label: 'Ждёт оплаты' },
  { value: 'cancelled', label: 'Отменён' },
];

const fields = [
  field(NuiInput, (v) => v.query, {
    label: 'Поиск',
    props: { type: 'search', placeholder: 'Номер или клиент' },
  }),
  field(NuiSelect, (v) => v.status, {
    label: 'Статус',
    props: { options: statuses, clearable: true, placeholder: 'Все статусы' },
  }),
];

const form = useForm<Filters>({
  initialValues: { query: '', status: null },
  onSubmit: () => undefined,
});
</script>
