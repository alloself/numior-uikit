<template>
  <div class="flex flex-col gap-3 w-full max-w-md">
    <NuiCommand :items="commands" @select="last = $event.label">
      <template #footer>
        <span class="text-xs text-muted-foreground">
          <NuiKbd keys="arrowup" size="sm" /> <NuiKbd keys="arrowdown" size="sm" /> navigate,
          <NuiKbd keys="enter" size="sm" /> select
        </span>
      </template>
    </NuiCommand>
    <p v-if="last" class="m-0 text-sm text-muted-foreground">“{{ last }}” is done.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Download, Settings } from '@lucide/vue';
import { NuiCommand, NuiKbd, type NuiCommandSource } from '@numior/vue';

const last = ref('');

const commands: NuiCommandSource = [
  {
    label: 'Orders',
    items: [
      { value: 'order', label: 'New order', icon: 'plus', shortcut: 'mod+shift+o' },
      {
        value: 'export',
        label: 'Export orders',
        icon: Download,
        description: 'Excel file for the chosen period',
      },
    ],
  },
  {
    label: 'Customers',
    items: [
      { value: 'customer', label: 'Find a customer', icon: 'search', keywords: ['client'] },
      {
        value: 'import',
        label: 'Import customers',
        icon: 'upload',
        description: 'Needs admin rights',
        disabled: true,
      },
    ],
  },
  {
    label: 'Store',
    items: [
      { value: 'settings', label: 'Settings', icon: Settings, shortcut: 'mod+shift+s' },
      { value: 'theme', label: 'Dark theme', icon: 'moon', shortcut: 'mod+shift+t' },
    ],
  },
];
</script>
