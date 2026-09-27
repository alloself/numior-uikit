<template>
  <NuiForm :form="form" submit-label="Сохранить" class="nui-max-w-md">
    <NuiFieldArray
      v-slot="{ row }"
      :form="form"
      :name="(v) => v.guests"
      :new-row="newGuest"
      :min="1"
      :max="4"
      label="Гости"
      description="От одного до четырёх"
      reorderable
    >
      <NuiFormField
        v-slot="{ field }"
        :form="form"
        :name="(v) => v.guests[row.index]?.name"
        :rules="nameRules"
        label="Имя"
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
  initialValues: { guests: [{ name: 'Анна Титова' }, { name: 'Игорь Белов' }] },
  onSubmit: () => undefined,
});
</script>
