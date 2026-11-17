<template>
  <div
    ref="root"
    data-nui-theme="light"
    class="p-4 bg-surface border rounded-md flex flex-col gap-4"
  >
    <NuiToggleGroup
      :model-value="scheme"
      :items="schemes"
      variant="segmented"
      icon-only
      required
      label="Схема области"
      @update:model-value="pick"
    />
    <p class="m-0 text-sm text-muted-foreground">
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
} from '@numior/kit';

const root = useTemplateRef<HTMLElement>('root');
const { scheme, resolved, set } = useColorScheme({ scope: root, initial: 'light' });

const schemes: readonly NuiToggleItem<ColorScheme>[] = [
  { value: 'light', label: 'Светлая', icon: 'sun' },
  { value: 'dark', label: 'Тёмная', icon: 'moon' },
  { value: 'system', label: 'Системная', icon: 'monitor' },
];

const pick = (next: ColorScheme | null): void => {
  if (!next) {
    return;
  }

  set(next);
};
</script>
