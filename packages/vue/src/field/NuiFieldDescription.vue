<template>
  <p :id="id" class="nui-field__description">
    <slot />
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFieldContext } from '@numior/primitives';

const field = useFieldContext();
const id = computed(() => field?.descriptionId.value);
</script>
