<template>
  <em>{{ column.label }}</em>
</template>

<script setup lang="ts">
import type { NuiTableHeaderSlot } from '../../src';
import type { Person } from '../support/people';

const { column } = defineProps<NuiTableHeaderSlot<Person>>();
</script>
