<template>
  <span class="nui-tab-item" role="presentation">
    <button
      :id="tabs.tabId(value)"
      :ref="list.tabs.ref(value)"
      type="button"
      role="tab"
      class="nui-tab"
      :class="{
        'nui-tab--selected': selected,
        'nui-tab--disabled': disabled,
        'nui-tab--closable': closable,
      }"
      :aria-selected="selected ? 'true' : 'false'"
      :aria-controls="tabs.panels.value ? tabs.panelId(value) : undefined"
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
      variant="plain"
      size="inline"
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
import { computed, onBeforeUnmount, onUnmounted } from 'vue';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useTabList, useTabs } from './tabs-context';
import { NuiTabsActivation, type NuiTabProps } from './tabs.types';
import { Key } from '@numior/primitives';

const PRIMARY_BUTTON = 0;
const MIDDLE_BUTTON = 1;

const { value, icon, disabled = false, closable = false } = defineProps<NuiTabProps>();

const emit = defineEmits<{ close: [] }>();

const tabs = useTabs();
const list = useTabList();
const selected = computed(() => tabs.modelValue.value === value);
const closes = computed(() => closable && !disabled);

let focusedOnLeave = false;

const activate = (): void => {
  if (!disabled) {
    tabs.select(value);
  }
};

const onFocus = (): void => {
  if (tabs.activation.value === NuiTabsActivation.Automatic) {
    activate();
  }
};

const close = (): void => {
  if (closes.value) {
    emit('close');
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.Delete && closes.value) {
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
  const element = list.tabs.get(value);

  focusedOnLeave = element !== undefined && document.activeElement === element;
});

onUnmounted(() => {
  if (focusedOnLeave) {
    list.restoreFocus();
  }
});
</script>
