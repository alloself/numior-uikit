<template>
  <NuiForm :form="form" submit-label="Save" class="nui-max-w-md">
    <NuiFieldArray
      v-slot="{ row }"
      :form="form"
      :name="(v) => v.guests"
      :new-row="newGuest"
      :min="1"
      :max="4"
      label="Guests"
      description="One to four"
      reorderable
    >
      <NuiFormField
        v-slot="{ field }"
        :form="form"
        :name="(v) => v.guests[row.index]?.name"
        :rules="nameRules"
        label="Name"
      >
        <NuiInput v-bind="field" :model-value="field.modelValue ?? ''" />
      </NuiFormField>
    </NuiFieldArray>
  </NuiForm>
</template>

<script setup lang="ts">
import { NuiInput } from '@numior/vue';
import { NuiFieldArray, NuiForm, NuiFormField, required, useForm } from '@numior/forms';

interface Guest {
  name: string;
}

const nameRules = [required()];
const newGuest = (): Guest => ({ name: '' });

const form = useForm({
  initialValues: { guests: [{ name: 'Anna Titova' }, { name: 'Igor Belov' }] },
  onSubmit: () => undefined,
});
</script>
