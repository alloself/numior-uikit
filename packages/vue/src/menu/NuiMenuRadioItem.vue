<template>
  <button
    type="button"
    role="menuitemradio"
    tabindex="-1"
    class="nui-menu-item nui-menu-item--checkable"
    :class="{ 'nui-menu-item--disabled': disabled, 'nui-menu-item--checked': selected }"
    :aria-checked="selected ? 'true' : 'false'"
    :aria-disabled="disabled || undefined"
    @click="choose"
  >
    <NuiMenuRow>
      <template #indicator><span v-if="selected" class="nui-menu-item__dot"></span></template>
      <slot />
    </NuiMenuRow>
  </button>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import NuiMenuRow from './NuiMenuRow.vue';
import { useMenu, useMenuRadio } from './menu-context';
import type { NuiMenuRadioItemProps } from './menu.types';

const { value, disabled = false, closeOnSelect = true } = defineProps<NuiMenuRadioItemProps<T>>();
const emit = defineEmits<{ select: [] }>();
const menu = useMenu();
const radio = useMenuRadio();
const selected = computed(() => radio.modelValue.value === value);

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
