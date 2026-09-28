<template>
  <div class="flex flex-col gap-3 w-full max-w-md">
    <div class="border rounded-md">
      <NuiCommand :items="commands" @select="last = $event.label">
        <template #footer>
          <span class="text-xs text-muted-foreground">
            <NuiKbd keys="arrowup" size="sm" /> <NuiKbd keys="arrowdown" size="sm" /> navigate,
            <NuiKbd keys="enter" size="sm" /> select
          </span>
        </template>
      </NuiCommand>
    </div>
    <p class="m-0 text-sm text-muted-foreground">Last command: {{ last || '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCommand, NuiKbd, type NuiCommandSource } from '@numior/vue';

const last = ref('');

const commands: NuiCommandSource = [
  {
    label: 'Sections',
    items: [
      { value: 'guide', label: 'Getting started', icon: 'file', shortcut: 'mod+1' },
      {
        value: 'theming',
        label: 'Theming',
        icon: 'sun',
        description: 'Colours, density, accents',
      },
      { value: 'button', label: 'Button', icon: 'command', keywords: ['btn'] },
    ],
  },
  {
    label: 'Actions',
    items: [
      { value: 'theme', label: 'Toggle theme', icon: 'moon', shortcut: 'mod+shift+t' },
      { value: 'locked', label: 'Unavailable action', disabled: true },
    ],
  },
];
</script>
