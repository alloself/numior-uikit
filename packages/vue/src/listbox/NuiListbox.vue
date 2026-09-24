<template>
  <div
    :id="id"
    role="listbox"
    class="nui-listbox"
    :aria-multiselectable="multiple || undefined"
    :aria-busy="loading || undefined"
    :aria-labelledby="labelledBy"
  >
    <template v-for="(group, groupIndex) in groups" :key="groupIndex">
      <div
        v-if="group.label !== undefined"
        role="group"
        class="nui-listbox__group"
        :aria-labelledby="`${id}-group-${groupIndex}`"
      >
        <div :id="`${id}-group-${groupIndex}`" class="nui-listbox__group-label">
          {{ group.label }}
        </div>
        <NuiListboxEntries v-bind="entryProps(group)" @select="emit('select', $event)">
          <template #option="slot"><slot name="option" v-bind="slot" /></template>
        </NuiListboxEntries>
      </div>
      <NuiListboxEntries v-else v-bind="entryProps(group)" @select="emit('select', $event)">
        <template #option="slot"><slot name="option" v-bind="slot" /></template>
      </NuiListboxEntries>
    </template>
    <div v-if="loading" class="nui-listbox__status">
      <NuiIcon alias="loader" class="nui-listbox__spinner" />
      {{ loadingLabel }}
    </div>
    <NuiEmpty
      v-else-if="groups.length === 0"
      size="sm"
      hide-icon
      :title="emptyLabel"
      class="nui-listbox__empty"
    />
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import NuiEmpty from '../empty/NuiEmpty.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { groupOptions, type NuiOption, type OptionGroupView } from '../shared/options';
import NuiListboxEntries from './NuiListboxEntries.vue';
import type { NuiListboxProps } from './listbox.types';

const {
  id,
  options,
  selectedKeys,
  keyOf,
  activeId,
  multiple = false,
  loading = false,
  emptyLabel,
  loadingLabel = 'Loading',
  labelledBy,
} = defineProps<NuiListboxProps<T>>();
const emit = defineEmits<{ select: [option: NuiOption<T>] }>();

const groups = computed(() => groupOptions(options));
const entryProps = (group: OptionGroupView<T>) => ({
  entries: group.entries,
  listboxId: id,
  selectedKeys,
  keyOf,
  activeId,
});
</script>
