<template>
  <div ref="root" class="nui-theme--light p-4 bg-surface border rounded-md flex flex-col gap-4">
    <NuiToggleGroup
      :model-value="scheme"
      :items="schemes"
      variant="segmented"
      icon-only
      required
      label="Area scheme"
      @update:model-value="pick"
    />
    <p class="m-0 text-sm text-muted-foreground">
      The area renders as {{ resolved }}, the rest of the page stays as it is.
    </p>
    <NuiButton>Button inside the area</NuiButton>
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
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

const pick = (next: ColorScheme | null): void => {
  if (!next) {
    return;
  }

  set(next);
};
</script>
