<template>
  <div>
    <NuiForm
      :form="form"
      :disabled="view.disabled"
      :readonly="view.readonly"
      :submit-label="submitLabel"
      :error-title="errorTitle"
    >
      <NuiFormField
        v-for="config in shown"
        :id="fieldId(config.path)"
        :key="config.path"
        :form="form"
        :name="byPath(config.path)"
        :label="config.label"
        :rules="view.rules.get(config.path) ?? config.rules"
        :validate-on="view.validateOn.get(config.path) ?? config.validateOn"
        :keep-value="config.keepValue"
        :readonly="config.readonly"
      >
        <template #default="{ field, value, setValue, pending }">
          <FormControl
            :control="config.control"
            :name="field.name"
            :value="value"
            :change="setValue"
          />
          <span v-if="pending" class="pending-mark" />
        </template>
      </NuiFormField>
    </NuiForm>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts" generic="V extends object">
import { computed } from 'vue';
import { NuiForm, NuiFormField, byPath, useForm, type UseFormOptions } from '../../src';
import FormControl from './FormControl.vue';
import { fieldId } from './field-id';
import type { FormFieldConfig, FormView } from './scenes.types';

const { options, fields, view, submitLabel, errorTitle } = defineProps<{
  options: UseFormOptions<V, unknown>;
  fields: readonly FormFieldConfig[];
  view: FormView;
  submitLabel?: string | undefined;
  errorTitle?: string | undefined;
}>();

const form = useForm<V, unknown>(options);
const shown = computed(() => fields.filter((config) => !view.hidden.has(config.path)));

defineExpose({ form });
</script>
