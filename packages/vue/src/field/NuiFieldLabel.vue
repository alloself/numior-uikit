<template>
  <component :is="tag" :id="id" class="nui-field__label" :for="htmlFor">
    <slot />
    <span v-if="required" class="nui-field__required" aria-hidden="true">*</span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFieldContext } from '@numior/primitives';

const field = useFieldContext();
const tag = computed(() => (field && !field.labelable.value ? 'legend' : 'label'));
const htmlFor = computed(() => (field?.labelable.value ? field.id.value : undefined));
const id = computed(() => field?.labelId.value);
const required = computed(() => field?.required.value ?? false);
</script>
