<template>
  <button
    type="button"
    role="menuitemcheckbox"
    tabindex="-1"
    class="nui-menu-item nui-menu-item--checkable"
    :class="{ 'nui-menu-item--disabled': disabled, 'nui-menu-item--checked': checked }"
    :aria-checked="checked ? 'true' : 'false'"
    :aria-disabled="disabled || undefined"
    @click="toggle"
  >
    <NuiMenuRow :icon="icon">
      <template #indicator><NuiIcon v-if="checked" alias="check" /></template>
      <slot />
    </NuiMenuRow>
  </button>
</template>

<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import NuiMenuRow from './NuiMenuRow.vue';
import { useMenu } from './menu-context';
import type { NuiMenuCheckboxItemProps } from './menu.types';

const { icon, disabled = false, closeOnSelect = false } = defineProps<NuiMenuCheckboxItemProps>();
const checked = defineModel<boolean>('checked', { default: false });
const emit = defineEmits<{ select: [] }>();
const menu = useMenu();

const toggle = (): void => {
  if (disabled) {
    return;
  }
  checked.value = !checked.value;
  emit('select');
  if (closeOnSelect) {
    menu.closeAll();
  }
};
</script>
