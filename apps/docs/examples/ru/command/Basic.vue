<template>
  <div class="nui-max-w-md nui-border nui-rounded">
    <NuiCommand :items="commands" @select="last = $event.label">
      <template #footer>
        <span class="nui-text-xs nui-text-muted">
          <NuiKbd keys="arrowup" size="sm" /> <NuiKbd keys="arrowdown" size="sm" /> навигация,
          <NuiKbd keys="enter" size="sm" /> выбрать
        </span>
      </template>
    </NuiCommand>
  </div>
  <p class="nui-m-0 nui-text-sm nui-text-muted">Последняя команда: {{ last || '—' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCommand, NuiKbd, type NuiCommandSource } from '@numior/vue';

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
