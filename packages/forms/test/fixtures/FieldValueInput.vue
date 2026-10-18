<template>
  <input :name="path" :value="value" />
</template>

<script setup lang="ts" generic="V extends object">
import { useField, type FieldSelector, type FormContext } from '../../src';

const { form, select } = defineProps<{
  form: FormContext<V>;
  select: FieldSelector<V, string>;
}>();

const { path, value } = useField(select, { form });
</script>
