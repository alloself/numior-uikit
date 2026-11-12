<template>
  <div
    v-if="shown"
    ref="root"
    class="nui-spreadsheet__tabs"
    @contextmenu="onContextmenu"
    @keydown="onKeydown"
    @dblclick="onDblclick"
  >
    <NuiTabs
      :model-value="current"
      :tabs="tabs"
      size="sm"
      :label="messages.sheets"
      @update:model-value="onSelect"
    />
    <NuiButton
      v-if="!readonly"
      variant="ghost"
      tone="neutral"
      size="xs"
      icon-only
      :aria-label="messages.addSheet"
      @click="emit('add', tabs.length)"
    >
      <NuiIcon icon="plus" />
    </NuiButton>
    <NuiMenu
      ref="menu"
      v-model:open="menuOpen"
      :anchor="target"
      :items="menuItems"
      :label="messages.sheetMenu"
      placement="top-start"
    />
    <NuiPopover
      v-model:open="renaming"
      :anchor="target"
      placement="top-start"
      padding="sm"
      @toggle="onRenameToggle"
    >
      <form ref="renameForm" class="nui-spreadsheet__rename" @submit.prevent="commitRename">
        <NuiInput
          v-model="draftName"
          size="sm"
          :label="messages.sheetName"
          :error="nameError"
          autocomplete="off"
          spellcheck="false"
        />
      </form>
    </NuiPopover>
  </div>
</template>

<script setup lang="ts">
import { Key, PopoverState, isComposing, useAfterRelease } from '@numior/primitives';
import {
  NuiButton,
  NuiIcon,
  NuiInput,
  NuiMenu,
  NuiPopover,
  NuiTabs,
  type NuiMenuEntry,
  type NuiMenuExposed,
} from '@numior/vue';
import { computed, nextTick, ref, shallowRef, useTemplateRef } from 'vue';
import { validSheetName } from '../core';
import { isKey } from './sheet-keys';
import type { SheetTabsProps } from './sheet.types';

const isOpening = (event: Event): boolean =>
  'newState' in event && event.newState === PopoverState.Open;

const { shown, tabs, current, readonly, messages } = defineProps<SheetTabsProps>();

const emit = defineEmits<{
  select: [index: number];
  add: [index: number];
  rename: [index: number, name: string];
  remove: [index: number];
  undo: [];
  redo: [];
}>();

const root = useTemplateRef<HTMLElement>('root');
const menu = useTemplateRef<NuiMenuExposed>('menu');
const renameForm = useTemplateRef<HTMLFormElement>('renameForm');

const target = shallowRef<HTMLElement | null>(null);
const targetIndex = ref(-1);
const menuOpen = ref(false);
const afterRelease = useAfterRelease();
const renaming = ref(false);
const draftName = ref('');
const tried = ref(false);

const takenNames = computed(() =>
  tabs.reduce(
    (names, tab, index) =>
      index === targetIndex.value ? names : names.add(tab.label.toLowerCase()),
    new Set<string>(),
  ),
);

const nextName = computed(() => draftName.value.trim());

const nameError = computed((): string | undefined => {
  if (!tried.value) {
    return undefined;
  }
  if (!validSheetName(nextName.value)) {
    return messages.sheetNameInvalid;
  }
  return takenNames.value.has(nextName.value.toLowerCase()) ? messages.sheetNameTaken : undefined;
});

const startRename = (): void => {
  draftName.value = tabs[targetIndex.value]?.label ?? '';
  tried.value = false;
  renaming.value = true;
};

const focusShown = (): void => {
  root.value
    ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    ?.focus({ preventScroll: true });
};

const restructure = async (change: () => void): Promise<void> => {
  target.value?.focus({ preventScroll: true });
  change();
  await nextTick();
  focusShown();
};

const menuItems = computed((): readonly NuiMenuEntry[] => [
  {
    key: 'insert',
    label: messages.insertSheet,
    onSelect: () => restructure(() => emit('add', targetIndex.value)),
  },
  { key: 'rename', label: messages.renameSheet, onSelect: startRename },
  {
    key: 'delete',
    label: messages.deleteSheet,
    tone: 'error',
    disabled: tabs.length < 2,
    onSelect: () => restructure(() => emit('remove', targetIndex.value)),
  },
]);

const tabOf = (node: EventTarget | null): HTMLElement | undefined => {
  const tab = node instanceof Element ? node.closest('[role="tab"]') : null;

  return tab instanceof HTMLElement && root.value?.contains(tab) === true ? tab : undefined;
};

const indexOf = (tab: HTMLElement): number =>
  [...(root.value?.querySelectorAll('[role="tab"]') ?? [])].indexOf(tab);

const aim = (node: EventTarget | null): boolean => {
  const tab = tabOf(node);

  if (readonly || tab === undefined) {
    return false;
  }
  target.value = tab;
  targetIndex.value = indexOf(tab);
  emit('select', targetIndex.value);
  return true;
};

const onSelect = (value: string | undefined): void => {
  const index = tabs.findIndex((tab) => tab.value === value);

  if (index < 0) {
    return;
  }

  emit('select', index);
};

const onContextmenu = (event: MouseEvent): void => {
  if (!aim(event.target)) {
    return;
  }
  event.preventDefault();

  afterRelease(event, () => {
    menuOpen.value = true;
  });
};

const historyAction = (event: KeyboardEvent): (() => void) | undefined => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return undefined;
  }

  if (isKey(event, 'KeyY', 'y') || (isKey(event, 'KeyZ', 'z') && event.shiftKey)) {
    return () => emit('redo');
  }

  return isKey(event, 'KeyZ', 'z') ? () => emit('undo') : undefined;
};

const onKeydown = (event: KeyboardEvent): void => {
  const action = tabOf(event.target) === undefined ? undefined : historyAction(event);

  if (isComposing(event)) {
    return;
  }

  if (action !== undefined) {
    event.preventDefault();
    action();
    return;
  }

  const menuKey = event.key === Key.ContextMenu || (event.key === Key.F10 && event.shiftKey);

  const acts = menuKey || event.key === Key.F2;

  if (!acts || !aim(event.target)) {
    return;
  }

  event.preventDefault();

  if (menuKey) {
    menu.value?.show('first');
  } else {
    startRename();
  }
};

const onDblclick = (event: MouseEvent): void => {
  if (!aim(event.target)) {
    return;
  }

  startRename();
};

const onRenameToggle = (event: Event): void => {
  if (!isOpening(event)) {
    return;
  }

  const field = renameForm.value?.querySelector('input');

  field?.focus();
  field?.select();
};

const commitRename = (): void => {
  tried.value = true;

  if (nameError.value !== undefined) {
    return;
  }

  renaming.value = false;
  emit('rename', targetIndex.value, nextName.value);
  target.value?.focus();
};
</script>
