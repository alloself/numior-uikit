<template>
  <p :id="id" class="nui-field__error">
    <slot />
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useField } from '@numior/primitives';

const field = useField();
const id = computed(() => field?.errorId.value);
</script>
