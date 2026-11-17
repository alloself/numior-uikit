<template>
  <div class="flex w-full max-w-2xl flex-col gap-3">
    <NuiSmartForm v-model:step="step" :form="form" :steps="steps" submit-label="Оформить заказ" />
    <p v-if="placed" class="m-0 text-sm text-muted-foreground">
      Заказ оформлен, письмо ушло на {{ placed }}
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
    label: 'Покупатель',
    layout: '"name name" "email phone"',
    fields: [
      field(NuiInput, (v) => v.name, { label: 'Имя', required: true, rules: [required()] }),
      field(NuiInput, (v) => v.email, {
        label: 'Почта',
        required: true,
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, (v) => v.phone, {
        label: 'Телефон',
        props: { type: 'tel', mask: '+7 ### ###-##-##' },
      }),
    ],
  },
  {
    value: 'delivery',
    label: 'Доставка',
    layout: '"delivery delivery" "city address"',
    fields: [
      field(NuiRadioGroup, (v) => v.delivery, {
        label: 'Способ',
        group: true,
        props: { options: deliveries, orientation: 'horizontal' },
      }),
      field(NuiInput, (v) => v.city, { label: 'Город', required: true, rules: [required()] }),
      field(NuiInput, (v) => v.address, {
        label: 'Адрес',
        required: true,
        when: needsAddress,
        rules: [required()],
      }),
    ],
  },
  {
    value: 'confirm',
    label: 'Подтверждение',
    fields: [
      field(NuiRadioGroup, (v) => v.payment, {
        label: 'Оплата',
        group: true,
        props: { options: payments },
      }),
      field(NuiTextarea, (v) => v.comment, {
        label: 'Комментарий для курьера',
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
    city: 'Москва',
    address: '',
    payment: 'card',
    comment: '',
  },
  onSubmit: (values) => {
    placed.value = values.email ?? '';
  },
});
</script>
