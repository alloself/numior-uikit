<template>
  <component :is="tag" :id="id" class="nui-field__label" :for="htmlFor">
    <slot />
    <span v-if="required" class="nui-field__required" aria-hidden="true">*</span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFieldContext } from '@numior/primitives';
import type { NuiFieldPartProps } from './field.types';

const { field } = defineProps<NuiFieldPartProps>();

const injected = useFieldContext();
const context = computed(() => field ?? injected);
const tag = computed(() => (context.value && !context.value.labelable.value ? 'legend' : 'label'));

const htmlFor = computed(() =>
  context.value?.labelable.value ? context.value.id.value : undefined,
);

const id = computed(() => context.value?.labelId.value);
const required = computed(() => context.value?.required.value ?? false);
</script>
