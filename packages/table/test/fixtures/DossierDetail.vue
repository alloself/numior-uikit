<template>
  <p>Досье: {{ row.name }}</p>
  <button type="button">Открыть досье</button>
  <input aria-label="Заметка" />
</template>

<script setup lang="ts">
import type { NuiTableDetailSlot } from '../../src';

const { row } = defineProps<NuiTableDetailSlot<{ readonly name: string }>>();
</script>
