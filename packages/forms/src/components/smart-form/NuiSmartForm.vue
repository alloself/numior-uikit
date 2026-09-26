<template>
  <NuiForm
    :form="form"
    class="nui-smart-form"
    :class="classes"
    :disabled="disabled"
    :submit-label="submitLabel"
  >
    <NuiSmartFormEntries :entries="entries" :scope="scope" :layout="layout" />
    <template v-if="$slots['form-errors']" #form-errors="props">
      <slot name="form-errors" v-bind="props" />
    </template>
    <template v-if="$slots.actions" #actions="props">
      <slot name="actions" v-bind="props" />
    </template>
  </NuiForm>
</template>

<script setup lang="ts" generic="T extends object">
import { computed, useSlots } from 'vue';
import NuiForm from '../form/NuiForm.vue';
import NuiSmartFormEntries from './NuiSmartFormEntries.vue';
import { declareEntries } from './declarations';
import { provideSmartSlots } from './smart-slots';
import type { NuiSmartFormProps, SmartScope } from './smart-form.types';

const {
  form,
  fields,
  layout,
  inline = undefined,
  disabled = false,
  submitLabel,
} = defineProps<NuiSmartFormProps<T>>();

provideSmartSlots(useSlots());

const entries = computed(() => fields ?? []);

const scope = computed<SmartScope>(() => ({
  values: form.values,
  prefix: '',
  slotPrefix: '',
  row: undefined,
}));

const classes = computed(() => ({
  'nui-smart-form--inline': inline === true || inline === 'grow',
  'nui-smart-form--grow': inline === 'grow',
}));

declareEntries(form, entries.value, () => scope.value);
</script>
