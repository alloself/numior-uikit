<template>
  <NuiForm :form="form">
    <NuiFieldArray
      :form="form"
      :name="contactsOf"
      label="Contacts"
      :min="min"
      :max="max"
      :reorderable="reorderable"
      :readonly="readonly"
      :new-row="addable ? newContact : undefined"
      :rules="listRules"
    >
      <template #default="{ row }">
        <NuiFormField :form="form" :name="nameAt(row.index)" label="Name" :rules="rowRules">
          <template #default="{ field }">
            <NuiInput v-bind="field" :model-value="field.modelValue ?? ''" />
          </template>
        </NuiFormField>
      </template>
    </NuiFieldArray>
  </NuiForm>
</template>

<script setup lang="ts">
import { NuiInput } from '@numior/vue';
import {
  NuiFieldArray,
  NuiForm,
  NuiFormField,
  useForm,
  type AnyFieldRule,
  type FormEngineFactory,
  type StandardSchema,
} from '../../src';
import type { Contact, Contacts } from './scenes.types';

const {
  names,
  min,
  max,
  reorderable = undefined,
  readonly = undefined,
  addable = true,
  rowRules,
  listRules,
  schema,
  engine,
} = defineProps<{
  names: readonly string[];
  min?: number | undefined;
  max?: number | undefined;
  reorderable?: boolean | undefined;
  readonly?: boolean | undefined;
  addable?: boolean | undefined;
  rowRules?: readonly AnyFieldRule<string | undefined, Contacts>[] | undefined;
  listRules?: readonly AnyFieldRule<readonly Contact[], Contacts>[] | undefined;
  schema?: StandardSchema<unknown, unknown> | undefined;
  engine?: FormEngineFactory | undefined;
}>();

const newContact = (): Contact => ({ name: '' });

const contactsOf = (values: Contacts) => values.contacts;

const nameAt = (index: number) => (values: Contacts) => values.contacts[index]?.name;

const form = useForm<Contacts, unknown>({
  initialValues: { contacts: names.map((name) => ({ name })) },
  schema,
  engine,
  onSubmit: () => undefined,
});

defineExpose({ form });
</script>
