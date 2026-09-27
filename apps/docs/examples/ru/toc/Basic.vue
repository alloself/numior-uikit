<template>
  <div class="nui-w-full nui-grid-auto nui-gap-6">
    <div
      ref="article"
      class="nui-h-80 nui-overflow-auto nui-border nui-rounded nui-p-4"
      tabindex="0"
    >
      <h2 id="toc-demo-install" class="nui-mt-0 nui-text-lg nui-font-semibold">Установка</h2>
      <p>Пакет ставится из workspace, стили подключаются по файлам.</p>
      <p>Токены темы приходят из base.css.</p>
      <h2 id="toc-demo-usage" class="nui-text-lg nui-font-semibold">Использование</h2>
      <p>Компонент принимает элементы списка и корень прокрутки.</p>
      <h3 id="toc-demo-basic" class="nui-font-semibold">Базовый пример</h3>
      <p>Достаточно передать заголовки с id.</p>
      <p>Вложенные children дают второй уровень.</p>
      <h3 id="toc-demo-advanced" class="nui-font-semibold">Расширенный пример</h3>
      <p>Активный пункт следует за прокруткой.</p>
      <p>Корень можно поменять на лету.</p>
      <h2 id="toc-demo-api" class="nui-text-lg nui-font-semibold">API</h2>
      <p>Линия задаёт долю высоты, где меняется активный пункт.</p>
      <p>Пропсы, события и слоты описаны в таблицах.</p>
      <p>Событие select приходит по клику.</p>
    </div>
    <NuiToc :items="items" :root="article" @select="last = $event" />
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiToc, type NuiTocItem } from '@numior/vue';

const article = useTemplateRef<HTMLElement>('article');
const last = ref('');

const items: readonly NuiTocItem[] = [
  { id: 'toc-demo-install', label: 'Установка' },
  {
    id: 'toc-demo-usage',
    label: 'Использование',
    children: [
      { id: 'toc-demo-basic', label: 'Базовый пример' },
      { id: 'toc-demo-advanced', label: 'Расширенный пример' },
    ],
  },
  { id: 'toc-demo-api', label: 'API' },
];
</script>
