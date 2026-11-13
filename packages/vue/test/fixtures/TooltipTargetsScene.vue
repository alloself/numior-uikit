<template>
  <div>
    <input class="outside" />
    <div ref="bar" class="bar">
      <button class="act" aria-label="Bold" data-keys="mod+shift+b">
        <span class="glyph">B</span>
      </button>
      <button class="act" aria-label="Italic">I</button>
      <button class="act" aria-label="Strike" data-quiet>S</button>
      <span class="gap">|</span>
    </div>
    <NuiTooltip
      id="hint"
      v-model:open="open"
      :anchor="{ within: bar, selector: '.act', when: speaks }"
      :open-delay="300"
      :close-delay="100"
      :shortcut="keysOf"
    >
      <template #default="{ target }">{{ target?.getAttribute('aria-label') }}</template>
    </NuiTooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiTooltip } from '../../src';

const bar = useTemplateRef<HTMLDivElement>('bar');
const open = ref(false);

const speaks = (target: HTMLElement): boolean => !target.hasAttribute('data-quiet');

const keysOf = (target: HTMLElement | null): string | undefined =>
  target?.getAttribute('data-keys') ?? undefined;

defineExpose({ open });
</script>
