<template>
  <NuiField v-if="scene === 'input'" label="Email" description="Work" error="Required">
    <NuiInput model-value="a" placeholder="name@example.com" />
  </NuiField>
  <NuiField v-else-if="scene === 'reserved-error'" label="Email" reserve-error>
    <NuiInput />
  </NuiField>
  <NuiField v-else-if="scene === 'otp'" label="Code">
    <NuiOtpField model-value="48" :group-size="3" placeholder="·" name="code" />
  </NuiField>
  <NuiField v-else-if="scene === 'select'" label="Fruit">
    <NuiSelect model-value="banana" name="fruit" :options="FRUITS" />
  </NuiField>
  <NuiField v-else-if="scene === 'combobox'" label="Fruit">
    <NuiCombobox model-value="banana" name="fruit" :options="FRUITS" />
  </NuiField>
  <NuiField v-else label="Plan" group>
    <NuiRadioGroup model-value="a">
      <NuiRadio value="a">A</NuiRadio>
      <NuiRadio value="b">B</NuiRadio>
    </NuiRadioGroup>
  </NuiField>
</template>

<script setup lang="ts">
import {
  NuiCombobox,
  NuiField,
  NuiInput,
  NuiOtpField,
  NuiRadio,
  NuiRadioGroup,
  NuiSelect,
} from '../../../src';

const { scene } = defineProps<{
  scene: 'input' | 'reserved-error' | 'otp' | 'select' | 'combobox' | 'radio-group';
}>();

const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
];
</script>
