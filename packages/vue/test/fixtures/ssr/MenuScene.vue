<template>
  <NuiMenu id="actions" :items="ENTRIES">
    <template #trigger="{ attrs }">
      <button v-bind="attrs">Actions</button>
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import { NuiMenu, type NuiMenuEntry } from '../../../src';

const ENTRIES: NuiMenuEntry[] = [
  { label: 'Copy', shortcut: '⌘C' },
  { type: 'separator' },
  { type: 'checkbox', label: 'Grid', checked: true, onCheckedChange: () => undefined },
  { type: 'sub', label: 'Export', items: [{ label: 'PDF' }] },
];
</script>
