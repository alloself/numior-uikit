<template>
  <NuiSmartForm :form="form" :fields="fields" inline submit-label="Show" />
</template>

<script setup lang="ts">
import { NuiInput, NuiSelect } from '@numior/kit';
import { NuiSmartForm, formConfig, useForm } from '@numior/kit/forms';

interface Filters {
  query: string;
  status: string | null;
}

const { field } = formConfig<Filters>();

const statuses = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'cancelled', label: 'Canceled' },
];

const fields = [
  field(NuiInput, (v) => v.query, {
    label: 'Search',
    props: { type: 'search', placeholder: 'Number or customer' },
  }),
  field(NuiSelect, (v) => v.status, {
    label: 'Status',
    props: { options: statuses, clearable: true, placeholder: 'All statuses' },
  }),
];

const form = useForm<Filters>({
  initialValues: { query: '', status: null },
  onSubmit: () => undefined,
});
</script>
