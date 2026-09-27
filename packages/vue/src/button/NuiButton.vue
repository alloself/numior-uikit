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
        'nui-button--icon-only': iconOnly ?? isIconOnlyContent(slots.default),
      },
    ]"
    v-bind="controlAttrs"
    @click="onClick"
  >
    <span class="nui-button__content">
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
import { destinationAttrs } from '../shared/destination';
import type { NuiButtonProps } from './button.types';
import { isIconOnlyContent } from './icon-only';

const {
  variant = 'solid',
  tone = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  iconOnly = undefined,
  as = 'a',
  href,
  to,
} = defineProps<NuiButtonProps>();

defineSlots<{ default?(): unknown }>();

const slots = useSlots();
const isLink = computed(() => href !== undefined || to !== undefined);
const tag = computed(() => (isLink.value ? as : 'button'));

const controlAttrs = computed(() => {
  const busy = loading || undefined;

  if (isLink.value) {
    return {
      ...(disabled ? {} : destinationAttrs(href, to)),
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
