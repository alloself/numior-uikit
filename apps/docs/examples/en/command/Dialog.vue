<template>
  <div class="flex flex-col gap-3">
    <NuiButton variant="outline" tone="neutral" @click="open = true">
      Command palette <NuiKbd keys="mod+j" size="sm" variant="plain" />
    </NuiButton>
    <NuiCommandDialog
      v-model:open="open"
      v-model:query="query"
      :items="commands"
      hotkey="mod+j"
      @select="last = $event.label"
    />
    <p class="m-0 text-sm text-muted-foreground">Last command: {{ last || '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiCommandDialog, NuiKbd, type NuiCommandSource } from '@numior/vue';

const open = ref(false);
const query = ref('');
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
