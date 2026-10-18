<template>
  <NuiTooltip id="hint">
    <template #trigger="{ attrs }">
      <button v-bind="attrs">Save</button>
    </template>
    <template #default>Saves the document</template>
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiTooltip } from '../../../src';
</script>
