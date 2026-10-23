<template>
  <NuiButton
    ref="button"
    class="nui-editor-toolbar__control nui-editor-toolbar__action"
    :variant="action.pressed ? 'soft' : 'ghost'"
    :tone="action.pressed ? 'primary' : 'neutral'"
    size="sm"
    tabindex="-1"
    :icon="action.icon"
    :aria-label="action.label"
    :aria-pressed="action.pressed === undefined ? undefined : String(action.pressed)"
    :disabled="disabled || action.disabled"
    @click="emit('press')"
  />
</template>

<script setup lang="ts">
import { NuiButton } from '@numior/vue';
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { useToolbarHints } from './toolbar-hints';
import type { NuiEditorToolbarButtonProps } from './toolbar.types';

const { action, disabled = false } = defineProps<NuiEditorToolbarButtonProps>();

const emit = defineEmits<{
  press: [];
}>();

const button = useTemplateRef<InstanceType<typeof NuiButton>>('button');
const hints = useToolbarHints();

const elementOf = (): Element | undefined => {
  const element: unknown = button.value?.$el;

  return element instanceof Element ? element : undefined;
};

onMounted(() => {
  const element = elementOf();

  if (element !== undefined) {
    hints?.register(element, () => action);
  }
});

onBeforeUnmount(() => {
  const element = elementOf();

  if (element !== undefined) {
    hints?.release(element);
  }
});
</script>
