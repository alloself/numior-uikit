<template>
  <div class="flex flex-col gap-3">
    <div
      ref="toolbar"
      role="toolbar"
      aria-label="Форматирование"
      class="flex flex-wrap gap-1"
      @keydown="navigation.onKeydown"
      @focusin="navigation.onFocusin"
    >
      <NuiButton
        v-for="(tool, index) in tools"
        :key="tool"
        :ref="buttons.ref(tool)"
        variant="ghost"
        tone="neutral"
        size="sm"
        :tabindex="index === 0 ? 0 : -1"
        @click="last = tool"
      >
        {{ tool }}
      </NuiButton>
    </div>
    <p v-if="last" class="m-0 text-sm text-muted-foreground">Нажата кнопка «{{ last }}».</p>
    <p v-else class="m-0 text-sm text-muted-foreground">Кнопка ещё не нажата.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiButton, createCollection, useListNavigation } from '@numior/kit';

const toolbar = useTemplateRef<HTMLElement>('toolbar');
const last = ref('');
const tools = ['Жирный', 'Курсив', 'Подчёркнутый', 'Ссылка', 'Код'];

const buttons = createCollection<string>();

const navigation = useListNavigation(toolbar, {
  items: buttons.elements,
  orientation: 'horizontal',
});
</script>
