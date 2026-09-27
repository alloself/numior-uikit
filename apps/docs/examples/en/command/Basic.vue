<template>
  <div class="nui-max-w-md nui-border nui-rounded">
    <NuiCommand :items="commands" @select="last = $event.label">
      <template #footer>
        <span class="nui-text-xs nui-text-muted">
          <NuiKbd keys="arrowup" size="sm" /> <NuiKbd keys="arrowdown" size="sm" /> navigate,
          <NuiKbd keys="enter" size="sm" /> select
        </span>
      </template>
    </NuiCommand>
  </div>
  <p class="nui-m-0 nui-text-sm nui-text-muted">Last command: {{ last || '—' }}</p>
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
