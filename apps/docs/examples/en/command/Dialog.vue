<template>
  <div class="flex flex-col items-start gap-3">
    <NuiButton variant="outline" tone="neutral" @click="open = true">
      Command palette <NuiKbd keys="mod+j" size="sm" variant="plain" />
    </NuiButton>
    <NuiCommandDialog
      v-model:open="open"
      :items="commands"
      hotkey="mod+j"
      @select="last = $event.label"
    />
    <p v-if="last" class="m-0 text-sm text-muted-foreground">“{{ last }}” is done.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Download, Settings } from '@lucide/vue';
import { NuiButton, NuiCommandDialog, NuiKbd, type NuiCommandSource } from '@numior/kit';

const open = ref(false);
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
