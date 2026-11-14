<template>
  <NuiForm :form="form" submit-label="Save order" class="w-full max-w-lg">
    <NuiFieldArray
      v-slot="{ row }"
      :form="form"
      :name="(v) => v.lines"
      :new-row="newLine"
      :row-label="lineLabel"
      :min="1"
      :max="5"
      label="Items of order 20401"
      description="One to five items"
      add-label="Add item"
      reorderable
    >
      <div class="@container">
        <div class="grid gap-3 @xs:grid-cols-[minmax(0,1fr)_7rem]">
          <NuiFormField
            v-slot="{ field }"
            :form="form"
            :name="(v) => v.lines[row.index]?.sku"
            :rules="productRules"
            label="Product"
          >
            <NuiSelect v-bind="field" :options="productOptions" placeholder="Choose a product" />
          </NuiFormField>
          <NuiFormField
            v-slot="{ field }"
            :form="form"
            :name="(v) => v.lines[row.index]?.quantity"
            :rules="quantityRules"
            label="Quantity"
          >
            <NuiNumberField v-bind="field" :model-value="field.modelValue ?? null" :min="1" />
          </NuiFormField>
        </div>
      </div>
    </NuiFieldArray>
  </NuiForm>
</template>

<script setup lang="ts">
import { NuiNumberField, NuiSelect } from '@numior/vue';
import { NuiFieldArray, NuiForm, NuiFormField, required, useForm } from '@numior/forms';
import { products } from '#demo/products';

interface Line {
  sku: string | null;
  quantity: number | null;
}

const productOptions = products.map((product) => ({ value: product.sku, label: product.name }));
const productRules = [required()];
const quantityRules = [required()];

const lines: Line[] = [
  { sku: 'S-101', quantity: 1 },
  { sku: 'X-507', quantity: 2 },
];

const newLine = (): Line => ({ sku: null, quantity: 1 });
const lineLabel = (index: number): string => `Item ${index}`;

const form = useForm({
  initialValues: { lines },
  onSubmit: () => undefined,
});
</script>
