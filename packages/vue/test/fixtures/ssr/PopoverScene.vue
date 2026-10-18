<template>
  <NuiPopover open>
    <template #trigger="{ attrs }">
      <button v-bind="attrs">Open</button>
    </template>
    <template #default>Content</template>
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiPopover } from '../../../src';
</script>
