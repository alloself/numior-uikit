<template>
  <form>
    <NuiNumberField :model-value="5" name="quantity" disabled />
    <NuiSelect model-value="apple" name="fruit" disabled :options="FRUITS" />
    <NuiDatePicker model-value="2026-09-26" locale="en-US" name="date" disabled />
  </form>
</template>

<script setup lang="ts">
import { NuiDatePicker, NuiNumberField, NuiSelect } from '../../../src';

const FRUITS = [{ value: 'apple', label: 'Apple' }];
</script>
