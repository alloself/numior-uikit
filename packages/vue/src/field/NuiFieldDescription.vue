<template>
  <p :id="id" class="nui-field__description">
    <slot />
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useField } from '@numior/primitives';

const field = useField();
const id = computed(() => field?.descriptionId.value);
</script>
