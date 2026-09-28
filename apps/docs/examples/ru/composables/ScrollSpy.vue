<template>
  <div class="w-full grid-auto gap-6">
    <div ref="root" class="h-80 overflow-auto border rounded-md p-4" tabindex="0">
      <section v-for="section in sections" :id="section.id" :key="section.id" class="min-h-40">
        <h3 class="mt-0 font-semibold">{{ section.label }}</h3>
        <p class="text-sm text-muted-foreground">{{ section.text }}</p>
      </section>
    </div>
    <div class="flex flex-col items-start gap-1">
      <NuiButton
        v-for="section in sections"
        :key="section.id"
        variant="ghost"
        :tone="section.id === activeId ? 'primary' : 'neutral'"
        size="sm"
        @click="jump(section.id)"
      >
        {{ section.label }}
      </NuiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { NuiButton } from '@numior/vue';
import { useScrollSpy } from '@numior/primitives';

const root = useTemplateRef<HTMLElement>('root');

const sections = [
  { id: 'spy-demo-plan', label: 'План', text: 'Собираем требования и рисуем макеты.' },
  { id: 'spy-demo-build', label: 'Сборка', text: 'Пишем компоненты и тесты.' },
  { id: 'spy-demo-ship', label: 'Релиз', text: 'Проверяем сборку и публикуем.' },
  { id: 'spy-demo-support', label: 'Поддержка', text: 'Разбираем обращения и чиним.' },
];

const { activeId, activate } = useScrollSpy(
  sections.map((section) => section.id),
  { root },
);

const jump = (id: string): void => {
  activate(id);
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
};
</script>
