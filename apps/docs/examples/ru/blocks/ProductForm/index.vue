<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-5 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">Новый товар</h1>
      <p class="m-0 text-sm text-muted-foreground">Товар появится в каталоге после сохранения</p>
    </div>
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
      <div class="grid gap-4 sm:grid-cols-2">
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.sku"
          :rules="skuRules"
          label="Артикул"
          description="Буква, дефис и три цифры"
          required
        >
          <NuiInput v-bind="field" />
        </NuiFormField>
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.category"
          :rules="categoryRules"
          label="Категория"
          required
        >
          <NuiSelect v-bind="field" :options="groups" placeholder="Выберите категорию" />
        </NuiFormField>
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.price"
          :rules="priceRules"
          label="Цена"
          required
        >
          <NuiNumberField v-bind="field" :min="0" :step="10" :format-options="PRICE_FORMAT" />
        </NuiFormField>
        <NuiFormField
          v-slot="{ field }"
          :form="form"
          :name="(v) => v.stock"
          :rules="stockRules"
          label="На складе"
        >
          <NuiNumberField v-bind="field" :min="0" />
        </NuiFormField>
      </div>
      <NuiFormField
        v-slot="{ field }"
        :form="form"
        :name="(v) => v.description"
        label="Описание"
        description="Материал, размеры, уход"
      >
        <NuiTextarea v-bind="field" :rows="4" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.photos" label="Фотографии">
        <NuiUpload v-bind="field" :upload="upload" accept="image/*" layout="grid" :max-files="4" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.visible">
        <NuiSwitch v-bind="field">Показывать в каталоге</NuiSwitch>
      </NuiFormField>
    </NuiForm>
  </div>
</template>

<script setup lang="ts">
import { promiseTimeout } from '@vueuse/core';
import {
  NuiInput,
  NuiNumberField,
  NuiSelect,
  NuiSwitch,
  NuiTextarea,
  NuiUpload,
  useToast,
  type NuiUploadAdapter,
  type NuiUploadItem,
} from '@numior/kit';
import {
  NuiForm,
  NuiFormError,
  NuiFormField,
  min,
  pattern,
  required,
  useForm,
} from '@numior/kit/forms';
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
  currency: 'RUB',
  maximumFractionDigits: 0,
};

const nameRules = [required(), min(3)];
const skuRules = [required(), pattern(/^[A-Z]-\d{3}$/, { message: 'Например, S-112' })];
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
      throw new NuiFormError({ sku: `Артикул ${values.sku} уже занят` });
    }
    toast.success(`${values.name}: товар сохранён`);
  },
});
</script>
