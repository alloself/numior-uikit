<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiForm :form="form" submit-label="Сохранить товар">
      <NuiFormField
        v-slot="{ field }"
        :form="form"
        :name="(v) => v.name"
        :rules="nameRules"
        label="Название"
        required
      >
        <NuiInput v-bind="field" />
      </NuiFormField>
      <NuiFormField
        v-slot="{ field, pending }"
        :form="form"
        :name="(v) => v.sku"
        :rules="skuRules"
        label="Артикул"
        description="Буква, дефис и три цифры"
        validate-on="change"
        required
      >
        <NuiInput v-bind="field" autocomplete="off">
          <template v-if="pending" #suffix>Проверяем…</template>
        </NuiInput>
      </NuiFormField>
    </NuiForm>
    <p v-if="saved" class="m-0 text-sm text-muted-foreground">
      Артикул {{ saved }} свободен, товар сохранён
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiInput } from '@numior/vue';
import { NuiForm, NuiFormField, customAsync, pattern, required, useForm } from '@numior/forms';
import { products } from '#demo/products';

const productWith = async (sku: string) => {
  await promiseTimeout(500);

  return products.find((product) => product.sku === sku);
};

const nameRules = [required()];

const skuRules = [
  required(),
  pattern(/^[A-Z]-\d{3}$/, { message: 'Например, S-112' }),
  customAsync<string>(async (value) => {
    const product = await productWith(value);

    return product === undefined ? undefined : `Артикул занят: ${product.name}`;
  }),
];

const saved = ref('');

const form = useForm({
  initialValues: { name: 'Кресло «Осло», серое', sku: 'S-101' },
  onSubmit: (values) => {
    saved.value = values.sku ?? '';
  },
});
</script>
