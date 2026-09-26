<template>
  <div
    class="nui-alert"
    :class="[
      `nui-alert--variant-${variant}`,
      `nui-alert--tone-${tone}`,
      { 'nui-alert--closed': !open },
    ]"
    :role="tone === 'error' ? 'alert' : undefined"
  >
    <NuiIcon v-if="iconAlias" :alias="iconAlias" class="nui-alert__icon" />
    <div class="nui-alert__body">
      <p v-if="hasTitle()" class="nui-alert__title">
        <slot name="title">{{ title }}</slot>
      </p>
      <div v-if="hasBody()" class="nui-alert__description">
        <slot>{{ description }}</slot>
      </div>
      <div v-if="$slots.actions" class="nui-alert__actions">
        <slot name="actions" />
      </div>
    </div>
    <NuiButton
      v-if="dismissible"
      variant="ghost"
      tone="neutral"
      size="sm"
      class="nui-alert__close"
      :aria-label="dismissText"
      @click="dismiss"
    >
      <NuiIcon alias="x" />
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useMessages } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { toneIcon } from '../shared/tone-icon';
import { alertMessages } from './alert.messages';
import type { NuiAlertProps } from './alert.types';

const {
  variant = 'soft',
  tone = 'info',
  title,
  description,
  icon,
  hideIcon = false,
  dismissible = false,
  dismissLabel,
} = defineProps<NuiAlertProps>();

const open = defineModel<boolean>('open', { default: true });
const emit = defineEmits<{ dismiss: [] }>();

const slots = useSlots();
const messages = useMessages(alertMessages);

const dismissText = computed(() => dismissLabel ?? messages.value.dismiss);
const iconAlias = computed(() => (hideIcon ? undefined : (icon ?? toneIcon(tone))));
const hasTitle = (): boolean => Boolean(title || slots.title);
const hasBody = (): boolean => Boolean(description || slots.default);

const dismiss = (): void => {
  open.value = false;
  emit('dismiss');
};
</script>
