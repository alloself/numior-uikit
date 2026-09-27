<template>
  <div
    ref="root"
    data-nui-theme="light"
    class="nui-p-4 nui-bg-surface nui-border nui-rounded nui-flex nui-flex-col nui-gap-4"
  >
    <NuiToggleGroup
      :model-value="scheme"
      :items="schemes"
      variant="segmented"
      required
      label="Схема области"
      @update:model-value="pick"
    />
    <p class="nui-m-0 nui-text-sm nui-text-muted">
      Область рисуется как {{ resolved }}, остальная страница не меняется.
    </p>
    <NuiButton>Кнопка внутри области</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import {
  NuiButton,
  NuiToggleGroup,
  useColorScheme,
  type ColorScheme,
  type NuiToggleItem,
} from '@numior/vue';

const root = useTemplateRef<HTMLElement>('root');
const { scheme, resolved, set } = useColorScheme({ scope: root, initial: 'light' });

const schemes: readonly NuiToggleItem<ColorScheme>[] = [
  { value: 'light', label: 'Светлая', icon: 'sun' },
  { value: 'dark', label: 'Тёмная', icon: 'moon' },
  { value: 'system', label: 'Системная', icon: 'monitor' },
];

const pick = (next: ColorScheme | null): void => {
  if (next) {
    set(next);
  }
};
</script>
