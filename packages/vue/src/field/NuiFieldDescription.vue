<template>
  <p :id="id" class="nui-field__description">
    <slot />
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFieldContext } from '@numior/primitives';
import type { NuiFieldPartProps } from './field.types';

const { field } = defineProps<NuiFieldPartProps>();

const injected = useFieldContext();
const id = computed(() => (field ?? injected)?.descriptionId.value);
</script>
