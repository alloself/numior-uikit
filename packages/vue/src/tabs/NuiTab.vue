<template>
  <span class="nui-tab-item" role="presentation">
    <button
      :id="tabs.tabId(value)"
      ref="root"
      type="button"
      role="tab"
      class="nui-tab"
      :class="{
        'nui-tab--selected': selected,
        'nui-tab--disabled': disabled,
        'nui-tab--closable': closable,
      }"
      :aria-selected="selected ? 'true' : 'false'"
      :aria-controls="tabs.panelId(value)"
      :aria-disabled="disabled || undefined"
      :tabindex="selected ? 0 : -1"
      @click="activate"
      @focus="onFocus"
      @keydown="onKeydown"
      @mousedown="onMousedown"
      @auxclick="onAuxclick"
    >
      <NuiIcon v-if="icon" :icon="icon" class="nui-tab__icon" />
      <span class="nui-tab__label"><slot /></span>
    </button>
    <NuiButton
      v-if="closable"
      variant="ghost"
      tone="neutral"
      size="sm"
      class="nui-tab__close"
      tabindex="-1"
      aria-hidden="true"
      :disabled="disabled"
      icon="x"
      @mousedown="onCloseMousedown"
      @click="close"
      @auxclick="onAuxclick"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onUnmounted, useTemplateRef } from 'vue';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useTabList, useTabs } from './tabs-context';
import type { NuiTabProps } from './tabs.types';

const PRIMARY_BUTTON = 0;
const MIDDLE_BUTTON = 1;

const { value, icon, disabled = false, closable = false } = defineProps<NuiTabProps>();

const emit = defineEmits<{ close: [] }>();

const tabs = useTabs();
const list = useTabList();
const root = useTemplateRef<HTMLButtonElement>('root');
const selected = computed(() => tabs.modelValue.value === value);
const closes = computed(() => closable && !disabled);

let focusedOnLeave = false;

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

const close = (): void => {
  if (closes.value) {
    emit('close');
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Delete' && closes.value) {
    event.preventDefault();
    emit('close');
  }
};

const onMousedown = (event: MouseEvent): void => {
  if (event.button !== PRIMARY_BUTTON) {
    event.preventDefault();
  }
};

const onCloseMousedown = (event: MouseEvent): void => {
  event.preventDefault();
};

const onAuxclick = (event: MouseEvent): void => {
  if (event.button === MIDDLE_BUTTON) {
    close();
  }
};

onBeforeUnmount(() => {
  focusedOnLeave = root.value !== null && document.activeElement === root.value;
});

onUnmounted(() => {
  if (focusedOnLeave) {
    list.restoreFocus();
  }
});
</script>
