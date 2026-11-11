<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-5 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">New product</h1>
      <p class="m-0 text-sm text-muted-foreground">
        The product appears in the catalog once you save it
      </p>
    </div>
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
      <div class="grid gap-4 sm:grid-cols-2">
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.sku"
          :rules="skuRules"
          label="SKU"
          description="A letter, a hyphen, and three digits"
          required
        >
          <NuiInput v-bind="field" />
        </NuiFormField>
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.category"
          :rules="categoryRules"
          label="Category"
          required
        >
          <NuiSelect v-bind="field" :options="groups" placeholder="Pick a category" />
        </NuiFormField>
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.price"
          :rules="priceRules"
          label="Price"
          required
        >
          <NuiNumberField v-bind="field" :min="0" :step="10" :format-options="PRICE_FORMAT" />
        </NuiFormField>
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.stock"
          :rules="stockRules"
          label="In stock"
        >
          <NuiNumberField v-bind="field" :min="0" />
        </NuiFormField>
      </div>
      <NuiFormField
        v-slot="{ field }"
        :form="form"
        :name="(v) => v.description"
        label="Description"
        description="Material, dimensions, care"
      >
        <NuiTextarea v-bind="field" :rows="4" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.photos" label="Photos">
        <NuiUpload v-bind="field" :upload="upload" accept="image/*" layout="grid" :max-files="4" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.visible">
        <NuiSwitch v-bind="field">Show in the catalog</NuiSwitch>
      </NuiFormField>
    </NuiForm>
  </div>
</template>

<script setup lang="ts">
import { promiseTimeout } from '@vueuse/core';
import { useToast } from '@numior/primitives';
import {
  NuiInput,
  NuiNumberField,
  NuiSelect,
  NuiSwitch,
  NuiTextarea,
  NuiUpload,
  type NuiUploadAdapter,
  type NuiUploadItem,
} from '@numior/vue';
import {
  NuiForm,
  NuiFormError,
  NuiFormField,
  min,
  pattern,
  required,
  useForm,
} from '@numior/forms';
import { categories, products } from '#demo/products';

interface ProductDraft {
  name: string;
  sku: string;
  category: string | null;
  price: number | null;
  stock: number | null;
  description: string;
  photos: NuiUploadItem<string>[];
  visible: boolean;
}

const PRICE_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
};

const nameRules = [required(), min(3)];
const skuRules = [required(), pattern(/^[A-Z]-\d{3}$/, { message: 'For example, S-112' })];
const categoryRules = [required()];
const priceRules = [required(), min(1)];
const stockRules = [min(0)];

const groups = categories.map((group) => ({
  label: group.label,
  items: (group.children ?? []).map((entry) => ({ value: entry.value, label: entry.label })),
}));

const sample = products[0];
const toast = useToast();

const initialValues: ProductDraft = {
  name: sample?.name ?? '',
  sku: sample?.sku ?? '',
  category: sample?.category ?? null,
  price: sample?.price ?? null,
  stock: 10,
  description: '',
  photos: [],
  visible: true,
};

const upload: NuiUploadAdapter<string> = (file) => Promise.resolve(URL.createObjectURL(file));

const form = useForm({
  initialValues,
  onSubmit: async (values) => {
    await promiseTimeout(700);

    if (products.some((product) => product.sku === values.sku)) {
      throw new NuiFormError({ sku: `SKU ${values.sku} is already taken` });
    }
    toast.success(`${values.name} is saved`);
  },
});
</script>
