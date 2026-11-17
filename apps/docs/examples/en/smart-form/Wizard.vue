<template>
  <div class="flex w-full max-w-2xl flex-col gap-3">
    <NuiSmartForm v-model:step="step" :form="form" :steps="steps" submit-label="Place order" />
    <p v-if="placed" class="m-0 text-sm text-muted-foreground">
      Order placed, the confirmation went to {{ placed }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput, NuiRadioGroup, NuiTextarea } from '@numior/kit';
import { NuiSmartForm, email, formConfig, required, useForm } from '@numior/kit/forms';
import { DELIVERIES, PAYMENTS, type Delivery, type Payment } from '#demo/orders';

interface Checkout {
  name: string;
  email: string;
  phone: string;
  delivery: Delivery;
  city: string;
  address: string;
  payment: Payment;
  comment: string;
}

const { field } = formConfig<Checkout>();

const deliveries = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));
const payments = Object.entries(PAYMENTS).map(([value, label]) => ({ value, label }));
const needsAddress = (values: Checkout): boolean => values.delivery !== 'pickup';

const steps = [
  {
    value: 'buyer',
    label: 'Buyer',
    layout: '"name name" "email phone"',
    fields: [
      field(NuiInput, (v) => v.name, { label: 'Name', required: true, rules: [required()] }),
      field(NuiInput, (v) => v.email, {
        label: 'Email',
        required: true,
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, (v) => v.phone, {
        label: 'Phone',
        props: { type: 'tel', mask: '(###) ###-####' },
      }),
    ],
  },
  {
    value: 'delivery',
    label: 'Delivery',
    layout: '"delivery delivery" "city address"',
    fields: [
      field(NuiRadioGroup, (v) => v.delivery, {
        label: 'Method',
        group: true,
        props: { options: deliveries, orientation: 'horizontal' },
      }),
      field(NuiInput, (v) => v.city, { label: 'City', required: true, rules: [required()] }),
      field(NuiInput, (v) => v.address, {
        label: 'Address',
        required: true,
        when: needsAddress,
        rules: [required()],
      }),
    ],
  },
  {
    value: 'confirm',
    label: 'Confirmation',
    fields: [
      field(NuiRadioGroup, (v) => v.payment, {
        label: 'Payment',
        group: true,
        props: { options: payments },
      }),
      field(NuiTextarea, (v) => v.comment, {
        label: 'Note for the courier',
        props: { rows: 3 },
      }),
    ],
  },
];

const step = ref<string>();
const placed = ref('');

const form = useForm<Checkout>({
  initialValues: {
    name: '',
    email: '',
    phone: '',
    delivery: 'courier',
    city: 'Boston',
    address: '',
    payment: 'card',
    comment: '',
  },
  onSubmit: (values) => {
    placed.value = values.email ?? '';
  },
});
</script>
