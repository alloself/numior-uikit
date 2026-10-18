<template>
  <strong>{{ text.toUpperCase() }}</strong>
</template>

<script setup lang="ts">
import type { NuiTableCellSlot } from '../../src';
import type { Person } from '../support/people';

const { text } = defineProps<NuiTableCellSlot<Person>>();
</script>
