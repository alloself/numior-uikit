<template>
  <div class="nui-flex nui-flex-col nui-gap-3">
    <NuiButton variant="outline" tone="neutral" @click="open = true">
      Палитра команд <NuiKbd keys="mod+j" size="sm" variant="plain" />
    </NuiButton>
    <NuiCommandDialog
      v-model:open="open"
      v-model:query="query"
      :items="commands"
      hotkey="mod+j"
      @select="last = $event.label"
    />
    <p class="nui-m-0 nui-text-sm nui-text-muted">Последняя команда: {{ last || '—' }}</p>
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
    label: 'Разделы',
    items: [
      { value: 'guide', label: 'Начало работы', icon: 'file', shortcut: 'mod+1' },
      {
        value: 'theming',
        label: 'Темизация',
        icon: 'sun',
        description: 'Цвета, плотность, акценты',
      },
      { value: 'button', label: 'Button', icon: 'command', keywords: ['кнопка'] },
    ],
  },
  {
    label: 'Действия',
    items: [
      { value: 'theme', label: 'Переключить тему', icon: 'moon', shortcut: 'mod+shift+t' },
      { value: 'locked', label: 'Недоступное действие', disabled: true },
    ],
  },
];
</script>
