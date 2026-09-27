<template>
  <div class="nui-w-full nui-grid-auto nui-gap-6">
    <div ref="root" class="nui-h-80 nui-overflow-auto nui-border nui-rounded nui-p-4" tabindex="0">
      <section v-for="section in sections" :id="section.id" :key="section.id" class="nui-min-h-40">
        <h3 class="nui-mt-0 nui-font-semibold">{{ section.label }}</h3>
        <p class="nui-text-sm nui-text-muted">{{ section.text }}</p>
      </section>
    </div>
    <div class="nui-flex nui-flex-col nui-items-start nui-gap-1">
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
  { id: 'spy-demo-plan', label: 'Plan', text: 'Gather requirements and draw mockups.' },
  { id: 'spy-demo-build', label: 'Build', text: 'Write components and tests.' },
  { id: 'spy-demo-ship', label: 'Ship', text: 'Verify the build and publish.' },
  { id: 'spy-demo-support', label: 'Support', text: 'Triage requests and fix.' },
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
