<template>
  <div class="flex flex-col gap-3 w-full max-w-md">
    <div class="border rounded-md">
      <NuiCommand :items="commands" @select="last = $event.label">
        <template #footer>
          <span class="text-xs text-muted-foreground">
            <NuiKbd keys="arrowup" size="sm" /> <NuiKbd keys="arrowdown" size="sm" /> навигация,
            <NuiKbd keys="enter" size="sm" /> выбрать
          </span>
        </template>
      </NuiCommand>
    </div>
    <p class="m-0 text-sm text-muted-foreground">Последняя команда: {{ last || '—' }}</p>
  </div>
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
