<template>
  <NuiSmartForm
    v-model:step="step"
    :form="form"
    :fields="fields"
    :steps="steps"
    :layout="layout"
    :inline="inline"
    :readonly="readonly"
    :reserve-error="reserveError"
  >
    <template v-if="parts.includes('kind-options')" #[KIND]>
      <NuiRadio value="person">Person</NuiRadio>
      <NuiRadio value="company">Company</NuiRadio>
    </template>
    <template v-if="parts.includes('bio-hint')" #[BIO_AFTER]>
      <p class="hint">Markdown works</p>
    </template>
    <template v-if="parts.includes('row-hint')" #[ROW_AFTER]>
      <p class="row-hint">Work address</p>
    </template>
    <template v-if="parts.includes('action-state')" #actions="{ pending, dirty }">
      <span class="state">{{ pending }}/{{ dirty }}</span>
    </template>
    <template v-else-if="parts.includes('step-state')" #actions="{ step: current, first, last }">
      <span class="state">{{ current }}:{{ first }}:{{ last }}</span>
    </template>
  </NuiSmartForm>
</template>

<script setup lang="ts" generic="V extends object">
import { NuiRadio } from '@numior/vue';
import {
  NuiSmartForm,
  useForm,
  type NuiSmartFormEntry,
  type NuiSmartFormStep,
  type UseFormOptions,
} from '../../src';
import type { SmartFormPart } from './scenes.types';

const {
  options,
  fields,
  steps,
  layout,
  inline = undefined,
  readonly = undefined,
  reserveError = undefined,
  parts = [],
} = defineProps<{
  options: UseFormOptions<V, unknown>;
  fields?: readonly NuiSmartFormEntry<V>[] | undefined;
  steps?: readonly NuiSmartFormStep<V>[] | undefined;
  layout?: string | undefined;
  inline?: boolean | 'grow' | undefined;
  readonly?: boolean | undefined;
  reserveError?: boolean | undefined;
  parts?: readonly SmartFormPart[] | undefined;
}>();

const step = defineModel<string | undefined>('step');

const KIND = 'kind';
const BIO_AFTER = 'bio:after';
const ROW_AFTER = 'contacts.email:after';

const form = useForm<V, unknown>(options);

defineExpose({ form });
</script>
