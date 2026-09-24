<template>
  <NuiLink
    v-if="href !== undefined || to !== undefined"
    :as="as"
    :href="href"
    :to="to"
    tone="neutral"
    underline="none"
    role="menuitem"
    tabindex="-1"
    class="nui-menu-item"
    :class="classes"
    :aria-disabled="disabled || undefined"
    @click="onClick"
    @keydown.space.prevent="onSpace"
  >
    <NuiMenuRow :icon="icon" :shortcut="shortcut"><slot /></NuiMenuRow>
  </NuiLink>
  <button
    v-else
    type="button"
    role="menuitem"
    tabindex="-1"
    class="nui-menu-item"
    :class="classes"
    :aria-disabled="disabled || undefined"
    @click="onClick"
  >
    <NuiMenuRow :icon="icon" :shortcut="shortcut"><slot /></NuiMenuRow>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiLink from '../link/NuiLink.vue';
import NuiMenuRow from './NuiMenuRow.vue';
import { useMenu } from './menu-context';
import type { NuiMenuItemProps } from './menu.types';

const {
  icon,
  shortcut,
  disabled = false,
  tone = 'neutral',
  closeOnSelect = undefined,
  href,
  to,
  as = 'a',
} = defineProps<NuiMenuItemProps>();

const emit = defineEmits<{ select: [] }>();
const menu = useMenu();

const classes = computed(() => [
  `nui-menu-item--tone-${tone}`,
  { 'nui-menu-item--disabled': disabled },
]);

const onClick = (event: Event): void => {
  if (disabled) {
    event.preventDefault();
    return;
  }
  emit('select');
  if (closeOnSelect ?? menu.closeOnSelect.value) {
    menu.closeAll();
  }
};

const onSpace = (event: KeyboardEvent): void => {
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.click();
  }
};
</script>
