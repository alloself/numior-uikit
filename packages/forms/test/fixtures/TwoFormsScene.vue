<template>
  <FormContextProbe :found="(context) => found('injected', context)" />
  <PickedFormProbe :form="forms[0]" :found="(context) => found('provided', context)" />
</template>

<script setup lang="ts">
import { useField, useForm, type FormHandle } from '../../src';
import FormContextProbe from './FormContextProbe.vue';
import PickedFormProbe from './PickedFormProbe.vue';
import type { Lookup, Names } from './scenes.types';

const { first, second, found } = defineProps<{
  first: Names;
  second: Names;
  found: (kind: Lookup, context: FormHandle | null) => void;
}>();

const noop = (): void => undefined;

const forms = [
  useForm({ initialValues: first, onSubmit: noop }),
  useForm({ initialValues: second, onSubmit: noop }),
] as const;

const field = useField((values: Names) => values.name, { form: forms[0] });

defineExpose({ forms, field });
</script>
