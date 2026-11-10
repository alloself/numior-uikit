<template>
  <div
    class="nui-alert"
    :class="[
      `nui-alert--variant-${variant}`,
      `nui-alert--tone-${tone}`,
      { 'nui-alert--closed': !open },
    ]"
    :role="tone === NuiTone.Error ? 'alert' : undefined"
  >
    <NuiIcon v-if="iconAlias" :icon="iconAlias" class="nui-alert__icon" />
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
      v-if="closable"
      variant="ghost"
      tone="neutral"
      size="sm"
      class="nui-alert__close"
      :aria-label="closeText"
      icon="x"
      @click="close"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useMessages } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { toneIcon } from '../shared/tone-icon';
import { alertMessages } from './alert.messages';
import { NuiAlertVariant, type NuiAlertProps } from './alert.types';
import { NuiTone } from '../shared/scale.types';

const {
  variant = NuiAlertVariant.Soft,
  tone = NuiTone.Info,
  title,
  description,
  icon,
  hideIcon = false,
  closable = false,
  closeLabel,
} = defineProps<NuiAlertProps>();

const open = defineModel<boolean>('open', { default: true });
const emit = defineEmits<{ close: [] }>();

const slots = useSlots();
const messages = useMessages(alertMessages);

const closeText = computed(() => closeLabel ?? messages.value.close);
const iconAlias = computed(() => (hideIcon ? undefined : (icon ?? toneIcon(tone))));
const hasTitle = (): boolean => Boolean(title || slots.title);
const hasBody = (): boolean => Boolean(description || slots.default);

const close = (): void => {
  open.value = false;
  emit('close');
};
</script>
