<template>
  <div class="nui-empty" :class="`nui-empty--size-${size}`">
    <span v-if="hasMedia()" class="nui-empty__media">
      <slot name="media"><NuiIcon :alias="icon" class="nui-empty__icon" /></slot>
    </span>
    <p v-if="hasTitle()" class="nui-empty__title">
      <slot name="title">{{ title }}</slot>
    </p>
    <div v-if="hasBody()" class="nui-empty__description">
      <slot>{{ description }}</slot>
    </div>
    <div v-if="$slots.actions" class="nui-empty__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiEmptyProps } from './empty.types';

const {
  icon = 'inbox',
  hideIcon = false,
  title,
  description,
  size = 'md',
} = defineProps<NuiEmptyProps>();

const slots = useSlots();
const hasMedia = (): boolean => Boolean(slots.media) || !hideIcon;
const hasTitle = (): boolean => Boolean(title || slots.title);
const hasBody = (): boolean => Boolean(description || slots.default);
</script>
