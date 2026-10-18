<template>
  <b>{{ text }}</b>
</template>

<script setup lang="ts">
import type { NuiTableFooterSlot } from '../../src';
import type { Person } from '../support/people';

const { text } = defineProps<NuiTableFooterSlot<Person>>();
</script>
