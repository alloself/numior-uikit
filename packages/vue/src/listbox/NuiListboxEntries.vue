<template>
  <NuiListboxOption
    v-for="entry in entries"
    :id="optionElementId(listboxId, entry.index)"
    :key="entry.index"
    :option="entry.option"
    :selected="selectedKeys.has(keyOf(entry.option.value))"
    :active="activeId === optionElementId(listboxId, entry.index)"
    @select="emit('select', entry.option)"
  >
    <slot
      name="option"
      :option="entry.option"
      :selected="selectedKeys.has(keyOf(entry.option.value))"
      :active="activeId === optionElementId(listboxId, entry.index)"
    />
  </NuiListboxOption>
</template>

<script setup lang="ts" generic="T">
import type { NuiOption, NuiOptionKey, OptionEntry } from '../shared/options';
import NuiListboxOption from './NuiListboxOption.vue';
import { optionElementId } from './listbox.types';

const { entries, listboxId, selectedKeys, keyOf, activeId } = defineProps<{
  entries: readonly OptionEntry<T>[];
  listboxId: string;
  selectedKeys: ReadonlySet<string>;
  keyOf: NuiOptionKey<T>;
  activeId?: string | undefined;
}>();
const emit = defineEmits<{ select: [option: NuiOption<T>] }>();
</script>
