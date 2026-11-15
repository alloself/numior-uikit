<template>
  <div class="flex flex-col gap-3 w-full max-w-md">
    <NuiCommand :items="commands" @select="last = $event.label">
      <template #footer>
        <span class="text-xs text-muted-foreground">
          <NuiKbd keys="arrowup" size="sm" /> <NuiKbd keys="arrowdown" size="sm" /> навигация,
          <NuiKbd keys="enter" size="sm" /> выбрать
        </span>
      </template>
    </NuiCommand>
    <p v-if="last" class="m-0 text-sm text-muted-foreground">Команда «{{ last }}» выполнена.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Download, Settings } from '@lucide/vue';
import { NuiCommand, NuiKbd, type NuiCommandSource } from '@numior/vue';

const last = ref('');

const commands: NuiCommandSource = [
  {
    label: 'Заказы',
    items: [
      { value: 'order', label: 'Новый заказ', icon: 'plus', shortcut: 'mod+shift+o' },
      {
        value: 'export',
        label: 'Экспорт заказов',
        icon: Download,
        description: 'Файл Excel за выбранный период',
      },
    ],
  },
  {
    label: 'Покупатели',
    items: [
      { value: 'customer', label: 'Найти покупателя', icon: 'search', keywords: ['клиент'] },
      {
        value: 'import',
        label: 'Загрузить покупателей',
        icon: 'upload',
        description: 'Нужны права администратора',
        disabled: true,
      },
    ],
  },
  {
    label: 'Кабинет',
    items: [
      { value: 'settings', label: 'Настройки', icon: Settings, shortcut: 'mod+shift+s' },
      { value: 'theme', label: 'Тёмная тема', icon: 'moon', shortcut: 'mod+shift+t' },
    ],
  },
];
</script>
