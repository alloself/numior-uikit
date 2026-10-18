<template>
  <i />
</template>

<script setup lang="ts">
import { useFormContext, type FormHandle } from '../../src';

const { found } = defineProps<{
  found: (context: FormHandle | null) => void;
}>();

found(useFormContext());
</script>
