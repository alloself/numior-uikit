<template>
  <button
    :id="tabs.tabId(value)"
    type="button"
    role="tab"
    class="nui-tab"
    :class="{ 'nui-tab--selected': selected, 'nui-tab--disabled': disabled }"
    :aria-selected="selected ? 'true' : 'false'"
    :aria-controls="tabs.panelId(value)"
    :aria-disabled="disabled || undefined"
    :tabindex="selected ? 0 : -1"
    @click="activate"
    @focus="onFocus"
    @mousedown="onMousedown"
  >
    <NuiIcon v-if="icon" :alias="icon" class="nui-tab__icon" />
    <span class="nui-tab__label"><slot /></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useTabs } from './tabs-context';
import type { NuiTabProps } from './tabs.types';

const PRIMARY_BUTTON = 0;

const { value, icon, disabled = false } = defineProps<NuiTabProps>();
const tabs = useTabs();
const selected = computed(() => tabs.modelValue.value === value);

const activate = (): void => {
  if (!disabled) {
    tabs.select(value);
  }
};

const onFocus = (): void => {
  if (tabs.activation.value === 'automatic') {
    activate();
  }
};

const onMousedown = (event: MouseEvent): void => {
  if (event.button !== PRIMARY_BUTTON) {
    event.preventDefault();
  }
};
</script>
