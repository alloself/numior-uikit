<template>
  <span>pressed</span>
</template>

<script setup lang="ts">
import { usePointerSession, type PointerSessionHandlers } from '../../src';

const { handlers, capture = false } = defineProps<{
  handlers: PointerSessionHandlers;
  capture?: boolean;
}>();

usePointerSession({ capture }).begin(handlers);
</script>
