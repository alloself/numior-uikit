<template>
  <button v-if="anchored" ref="anchor" type="button" class="anchor">Cell</button>
  <NuiMenu
    ref="menu"
    v-bind="props"
    v-model:open="open"
    :anchor="anchored ? anchor : undefined"
    :items="items"
  >
    <template v-if="!anchored" #trigger="{ attrs }">
      <button v-bind="attrs" type="button">Actions</button>
    </template>
    <template v-if="parts" #default>
      <NuiMenuItem icon="check" shortcut="⌘R" @select="log.push('Rename')">Rename</NuiMenuItem>
      <NuiMenuItem disabled @select="log.push('Locked')">Locked</NuiMenuItem>
      <NuiMenuItem href="/docs" @select="log.push('Docs')">
        Docs
        <template #trailing>
          <span class="nui-menu-item__trailing-mark">✓</span>
        </template>
      </NuiMenuItem>
      <NuiMenuCheckboxItem v-model:checked="bold">Bold</NuiMenuCheckboxItem>
      <NuiMenuRadioGroup v-model="align">
        <NuiMenuRadioItem value="left">Left</NuiMenuRadioItem>
        <NuiMenuRadioItem value="center">Center</NuiMenuRadioItem>
      </NuiMenuRadioGroup>
      <NuiMenuSeparator />
      <NuiMenuLabel>More</NuiMenuLabel>
      <NuiMenuSub label="Share">
        <NuiMenuItem @select="log.push('Email')">Email</NuiMenuItem>
        <NuiMenuItem @select="log.push('Link')">Link</NuiMenuItem>
      </NuiMenuSub>
      <NuiMenuItem tone="error" @select="log.push('Delete')">Delete</NuiMenuItem>
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'vue';
import {
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
  type NuiMenuEntry,
  type NuiMenuFocus,
  type NuiMenuProps,
} from '../../src';

const {
  props = {},
  entries = undefined,
  parts = false,
  initiallyOpen = false,
  anchored = false,
} = defineProps<{
  props?: NuiMenuProps | undefined;
  entries?: readonly NuiMenuEntry[] | undefined;
  parts?: boolean | undefined;
  initiallyOpen?: boolean | undefined;
  anchored?: boolean | undefined;
}>();

const open = ref(initiallyOpen);
const items = shallowRef(entries);
const log: string[] = [];
const bold = ref(false);
const align = ref('left');
const anchor = useTemplateRef<HTMLButtonElement>('anchor');
const menu = useTemplateRef('menu');

const show = (focus?: NuiMenuFocus): void => {
  menu.value?.show(focus);
};

defineExpose({ open, items, log, bold, align, anchor, show });
</script>
