<template>
  <div>
    <OptionalField :field="field">
      <NuiNumberField v-bind="props" v-model="model">
        <template v-if="prefix !== undefined" #prefix>
          <span>{{ prefix }}</span>
        </template>
      </NuiNumberField>
    </OptionalField>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiNumberField, type NuiFieldProps, type NuiNumberFieldProps } from '../../src';
import OptionalField from './OptionalField.vue';

const {
  props = {},
  initialValue = null,
  field = undefined,
  prefix = undefined,
} = defineProps<{
  props?: NuiNumberFieldProps | undefined;
  initialValue?: number | null | undefined;
  field?: NuiFieldProps | undefined;
  prefix?: string | undefined;
}>();

const model = ref(initialValue);

defineExpose({ model });
</script>
