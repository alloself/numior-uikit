<template>
  <div>
    <OptionalField :field="field">
      <NuiSelect :options="FRUITS" v-bind="{ ...props, ...selection.props() }" />
    </OptionalField>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { NuiSelect, type NuiFieldProps, type NuiSelectProps } from '../../src';
import { FRUITS } from '../support/options';
import type { Selection } from '../support/selection';
import OptionalField from './OptionalField.vue';

const {
  props = {},
  selection,
  field = undefined,
} = defineProps<{
  props?: Partial<NuiSelectProps<unknown>> | undefined;
  selection: Selection;
  field?: NuiFieldProps | undefined;
}>();
</script>
