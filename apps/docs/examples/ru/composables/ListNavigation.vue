<template>
  <div class="nui-flex nui-flex-col nui-gap-3">
    <div
      ref="toolbar"
      role="toolbar"
      aria-label="Форматирование"
      class="nui-flex nui-gap-1"
      @keydown="navigation.onKeydown"
      @focusin="navigation.onFocusin"
    >
      <NuiButton
        v-for="(tool, index) in tools"
        :key="tool"
        variant="ghost"
        tone="neutral"
        size="sm"
        :tabindex="index === 0 ? 0 : -1"
        @click="last = tool"
      >
        {{ tool }}
      </NuiButton>
    </div>
    <p class="nui-m-0 nui-text-sm nui-text-muted">Последнее действие: {{ last || '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiButton } from '@numior/vue';
import { useListNavigation } from '@numior/primitives';

const toolbar = useTemplateRef<HTMLElement>('toolbar');
const last = ref('');
const tools = ['Жирный', 'Курсив', 'Подчёркнутый', 'Ссылка', 'Код'];

const navigation = useListNavigation(toolbar, { selector: 'button', orientation: 'horizontal' });
</script>
