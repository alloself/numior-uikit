<template>
  <component
    :is="tag"
    class="nui-button"
    :class="[
      `nui-button--variant-${variant}`,
      `nui-button--tone-${tone}`,
      `nui-button--size-${size}`,
      {
        'nui-button--loading': loading,
        'nui-button--disabled': disabled,
        'nui-button--icon-only': squared(),
      },
    ]"
    v-bind="controlAttrs"
    @click="onClick"
  >
    <span class="nui-button__content">
      <NuiIcon v-if="icon" :alias="icon" />
      <slot />
    </span>
    <span v-if="loading" class="nui-button__loader">
      <NuiIcon alias="loader" class="nui-button__spinner" />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { destinationAttrs, useLinkTag } from '../shared/destination';
import type { NuiButtonProps } from './button.types';
import { slotContent } from './icon-only';

const {
  variant = 'solid',
  tone = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  iconOnly = undefined,
  icon,
  as,
  href,
  to,
} = defineProps<NuiButtonProps>();

defineSlots<{ default?(): unknown }>();

const slots = useSlots();

const squared = (): boolean => {
  const content = slotContent(slots.default);

  return iconOnly ?? (content === 'icons' || (content === 'empty' && icon !== undefined));
};

const isLink = computed(() => href !== undefined || to !== undefined);
const linkTag = useLinkTag(() => ({ as, to }));
const tag = computed(() => (isLink.value ? linkTag.value : 'button'));

const controlAttrs = computed(() => {
  const busy = loading || undefined;

  if (isLink.value) {
    return {
      ...(disabled ? {} : destinationAttrs(href, to, linkTag.value)),
      'aria-disabled': disabled || loading ? 'true' : undefined,
      tabindex: disabled ? -1 : undefined,
      'aria-busy': busy,
    };
  }
  return { type, disabled, 'aria-disabled': loading ? 'true' : undefined, 'aria-busy': busy };
});

const onClick = (event: MouseEvent): void => {
  if (loading || (disabled && isLink.value)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
};
</script>
