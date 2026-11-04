<template>
  <div
    ref="root"
    class="nui-toast nui-layer"
    :class="[`nui-toast--tone-${toast.tone}`, { 'nui-toast--leaving': toast.leaving }]"
    :role="toast.tone === NuiTone.Error ? 'alert' : undefined"
    tabindex="-1"
    @keydown.escape="onEscape"
  >
    <NuiIcon v-if="icon" :icon="icon" class="nui-toast__icon" />
    <div class="nui-toast__body">
      <p class="nui-toast__title">{{ toast.title }}</p>
      <p v-if="toast.description" class="nui-toast__description">{{ toast.description }}</p>
    </div>
    <NuiButton
      v-if="toast.action"
      variant="solid"
      tone="neutral"
      size="sm"
      class="nui-toast__action"
      @click="runAction"
    >
      {{ toast.action.label }}
    </NuiButton>
    <NuiButton
      v-if="toast.dismissible"
      variant="ghost"
      tone="neutral"
      size="sm"
      class="nui-toast__close"
      :aria-label="closeText"
      icon="x"
      @click="dismiss"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useMessages, useToastStore } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { toneIcon } from '../shared/tone-icon';
import { focusNeighbour } from './focus-neighbour';
import { toastMessages } from './toast.messages';
import type { NuiToastProps } from './toast.types';
import { NuiTone } from '../shared/scale.types';

const { toast, closeLabel } = defineProps<NuiToastProps>();

const store = useToastStore();
const messages = useMessages(toastMessages);
const rootElement = useTemplateRef<HTMLElement>('root');

const icon = computed(() => toneIcon(toast.tone));
const closeText = computed(() => closeLabel ?? messages.value.close);

const dismiss = (): void => {
  const element = rootElement.value;
  if (element && element.contains(document.activeElement)) {
    focusNeighbour(element);
  }
  store.dismiss(toast.id);
};

const runAction = (): void => {
  toast.action?.onClick();
  dismiss();
};

const onEscape = (): void => {
  if (toast.dismissible) {
    dismiss();
  }
};
</script>
