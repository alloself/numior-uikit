<template>
  <button
    type="button"
    :ref="itemRef"
    role="menuitemcheckbox"
    tabindex="-1"
    class="nui-menu-item"
    :class="{ 'nui-menu-item--disabled': disabled, 'nui-menu-item--checked': checked }"
    :aria-checked="checked ? 'true' : 'false'"
    :aria-disabled="disabled || undefined"
    @click="toggle"
  >
    <NuiMenuRow :icon="icon">
      <slot />
      <template #trailing>
        <span class="nui-menu-item__check"><NuiIcon v-if="checked" icon="check" /></span>
      </template>
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
const itemRef = menu.items.ref(Symbol('menu-item'));

const toggle = (): void => {
  if (disabled) {
    return;
  }
  checked.value = !checked.value;
  emit('select');
  if (!closeOnSelect) {
    return;
  }

  menu.closeAll();
};
</script>
