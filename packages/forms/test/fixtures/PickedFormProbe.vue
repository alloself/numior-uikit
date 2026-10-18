<template>
  <FormContextProbe :found="found" />
</template>

<script setup lang="ts">
import { provideForm, type FormHandle } from '../../src';
import FormContextProbe from './FormContextProbe.vue';

const { form, found } = defineProps<{
  form: FormHandle;
  found: (context: FormHandle | null) => void;
}>();

provideForm(form);
</script>
