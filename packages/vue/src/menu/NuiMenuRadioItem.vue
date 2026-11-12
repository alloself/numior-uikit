<template>
  <button
    type="button"
    :ref="itemRef"
    role="menuitemradio"
    tabindex="-1"
    class="nui-menu-item"
    :class="{ 'nui-menu-item--disabled': disabled, 'nui-menu-item--checked': selected }"
    :aria-checked="selected ? 'true' : 'false'"
    :aria-disabled="disabled || undefined"
    @click="choose"
  >
    <NuiMenuRow :icon="icon">
      <slot />
      <template #trailing>
        <span class="nui-menu-item__check"><NuiIcon v-if="selected" icon="check" /></span>
      </template>
    </NuiMenuRow>
  </button>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiMenuRow from './NuiMenuRow.vue';
import { useMenu, useMenuRadio } from './menu-context';
import type { NuiMenuRadioItemProps } from './menu.types';

const {
  value,
  icon,
  disabled = false,
  closeOnSelect = true,
} = defineProps<NuiMenuRadioItemProps<T>>();

const emit = defineEmits<{ select: [] }>();
const menu = useMenu();
const itemRef = menu.items.ref(Symbol('menu-item'));
const radio = useMenuRadio();
const selected = computed(() => radio.selectedKey.value === radio.keyOf(value));

const choose = (): void => {
  if (disabled) {
    return;
  }
  radio.select(value);
  emit('select');
  if (closeOnSelect) {
    menu.closeAll();
  }
};
</script>
