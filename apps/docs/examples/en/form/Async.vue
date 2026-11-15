<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiForm :form="form" submit-label="Save product">
      <NuiFormField
        v-slot="{ field }"
        :form="form"
        :name="(v) => v.name"
        :rules="nameRules"
        label="Name"
        required
      >
        <NuiInput v-bind="field" />
      </NuiFormField>
      <NuiFormField
        v-slot="{ field, pending }"
        :form="form"
        :name="(v) => v.sku"
        :rules="skuRules"
        label="SKU"
        description="A letter, a hyphen and three digits"
        validate-on="change"
        required
      >
        <NuiInput v-bind="field" autocomplete="off">
          <template v-if="pending" #suffix>Checking…</template>
        </NuiInput>
      </NuiFormField>
    </NuiForm>
    <p v-if="saved" class="m-0 text-sm text-muted-foreground">
      SKU {{ saved }} is free, the product is saved
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
  pattern(/^[A-Z]-\d{3}$/, { message: 'For example, S-112' }),
  customAsync<string>(async (value) => {
    const product = await productWith(value);

    return product === undefined ? undefined : `SKU taken by the ${product.name}`;
  }),
];

const saved = ref('');

const form = useForm({
  initialValues: { name: 'Oslo armchair, gray', sku: 'S-101' },
  onSubmit: (values) => {
    saved.value = values.sku ?? '';
  },
});
</script>
