<template>
  <NuiDialog
    v-model:open="open"
    :id="id"
    class="nui-command-dialog"
    placement="top"
    bare
    :closable="true"
    :title="texts.title"
    hide-title
  >
    <NuiCommand
      ref="command"
      v-model:query="query"
      :items="items"
      :selected="selected"
      :filter="filter"
      :loading="loading"
      :loop="loop"
      :get-key="getKey"
      :label="label"
      :placeholder="placeholder"
      :empty-label="emptyLabel"
      :loading-label="loadingLabel"
      autofocus
      embedded
      @select="onSelect"
      @search="emit('search', $event)"
    >
      <template v-if="$slots.item" #item="slot"><slot name="item" v-bind="slot" /></template>
      <template #end>
        <slot name="end">
          <NuiKbd keys="esc" size="sm" />
        </slot>
      </template>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </NuiCommand>
  </NuiDialog>
</template>

<script setup lang="ts" generic="T">
import { computed, watch } from 'vue';
import { useHotkey, useMessages } from '@numior/primitives';
import NuiDialog from '../dialog/NuiDialog.vue';
import NuiKbd from '../kbd/NuiKbd.vue';
import NuiCommand from './NuiCommand.vue';
import { commandMessages } from './command.messages';
import type { NuiCommandDialogProps, NuiCommandItem, NuiCommandItemSlot } from './command.types';

const {
  id,
  items,
  selected = undefined,
  filter = undefined,
  loading = false,
  loop = true,
  getKey,
  label,
  placeholder,
  emptyLabel,
  loadingLabel,
  title,
  hotkey = undefined,
  closeOnSelect = true,
} = defineProps<NuiCommandDialogProps<T>>();

const open = defineModel<boolean>('open', { default: false });
const query = defineModel<string>('query', { default: '' });
const emit = defineEmits<{ select: [item: NuiCommandItem<T>]; search: [query: string] }>();

defineSlots<{
  item?(props: NuiCommandItemSlot<T>): unknown;
  end?(): unknown;
  footer?(): unknown;
}>();

const messages = useMessages(commandMessages);
const texts = computed(() => ({ title: title ?? messages.value.title }));

const onSelect = (item: NuiCommandItem<T>): void => {
  emit('select', item);

  if (closeOnSelect) {
    open.value = false;
  }
};

let left: string | undefined;

watch(open, (shown) => {
  if (!shown) {
    left = query.value;
    return;
  }
  if (query.value === left) {
    query.value = '';
  }

  left = undefined;
});

useHotkey(
  () => (hotkey === false ? '' : (hotkey ?? 'mod+k')),
  () => {
    open.value = !open.value;
  },
  { enabled: () => hotkey !== false },
);
</script>
