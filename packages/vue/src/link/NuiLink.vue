<template>
  <component
    :is="disabled ? 'a' : tag"
    class="nui-link"
    :class="[
      `nui-link--tone-${tone}`,
      `nui-link--underline-${underline}`,
      { 'nui-link--disabled': disabled },
    ]"
    v-bind="linkAttrs"
  >
    <slot />
    <NuiIcon v-if="external" icon="external-link" class="nui-link__icon" />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { destinationAttrs, useLinkTag } from '../shared/destination';
import { NuiLinkUnderline, type NuiLinkProps } from './link.types';
import { NuiTone } from '../shared/scale.types';

const {
  as,
  href,
  to,
  tone = NuiTone.Primary,
  underline = NuiLinkUnderline.Always,
  external = false,
  disabled = false,
} = defineProps<NuiLinkProps>();

const tag = useLinkTag(() => ({ as, to }));

const linkAttrs = computed(() => {
  if (disabled) {
    return { 'aria-disabled': 'true', tabindex: -1 };
  }
  return {
    ...destinationAttrs(href, to, tag.value),
    ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
  };
});
</script>
