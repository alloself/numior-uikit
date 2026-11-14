<template>
  <div class="flex flex-col items-start gap-3">
    <NuiButton variant="outline" tone="neutral" @click="open = true">
      Палитра команд <NuiKbd keys="mod+j" size="sm" variant="plain" />
    </NuiButton>
    <NuiCommandDialog
      v-model:open="open"
      :items="commands"
      hotkey="mod+j"
      @select="last = $event.label"
    />
    <p v-if="last" class="m-0 text-sm text-muted-foreground">Команда «{{ last }}» выполнена.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Download, Settings } from '@lucide/vue';
import { NuiButton, NuiCommandDialog, NuiKbd, type NuiCommandSource } from '@numior/vue';

const open = ref(false);
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
