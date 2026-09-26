<template>
  <p :id="id" class="nui-field__error">
    <slot />
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFieldContext } from '@numior/primitives';

const field = useFieldContext();
const id = computed(() => field?.errorId.value);
</script>
