<template>
  <component
    :is="disabled ? 'a' : as"
    class="nui-link"
    :class="[
      `nui-link--tone-${tone}`,
      `nui-link--underline-${underline}`,
      { 'nui-link--disabled': disabled },
    ]"
    v-bind="linkAttrs"
  >
    <slot />
    <NuiIcon v-if="external" alias="external-link" class="nui-link__icon" />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiLinkProps } from './link.types';

const {
  as = 'a',
  href,
  to,
  tone = 'primary',
  underline = 'always',
  external = false,
  disabled = false,
} = defineProps<NuiLinkProps>();

const destination = (url: string | undefined, route: unknown): Record<string, unknown> => {
  if (route !== undefined) {
    return { to: route };
  }
  return url === undefined ? {} : { href: url };
};

const linkAttrs = computed(() => {
  if (disabled) {
    return { 'aria-disabled': 'true', tabindex: -1 };
  }
  return {
    ...destination(href, to),
    ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
  };
});
</script>
