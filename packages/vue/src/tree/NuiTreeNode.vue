<template>
  <NuiListItem
    :id="id"
    :value="node.item.value"
    :label="node.item.label"
    :description="node.item.description"
    :badge="node.item.badge"
    :shortcut="node.item.shortcut"
    :current="node.item.current"
    :disabled="node.item.disabled"
    class="nui-tree__item"
    :class="{
      'nui-tree__item--expanded': node.expanded,
      'nui-tree__item--loading': node.loading,
      'nui-tree__item--revealing': revealing,
    }"
    :style="style"
  >
    <template #leading>
      <span class="nui-tree__controls">
        <span class="nui-tree__toggle" aria-hidden="true">
          <NuiIcon v-if="node.loading" icon="loader" class="nui-tree__spinner" />
          <NuiIcon v-else-if="node.hasChildren" icon="chevron-right" class="nui-tree__chevron" />
        </span>
        <span
          v-if="checked"
          class="nui-tree__checkbox"
          :class="{
            'nui-tree__checkbox--checked': checked === 'checked',
            'nui-tree__checkbox--indeterminate': checked === 'indeterminate',
          }"
        >
          <NuiCheckbox
            size="sm"
            class="nui-tree__box"
            :model-value="checked === 'checked'"
            :indeterminate="checked === 'indeterminate'"
            :disabled="node.item.disabled"
            tabindex="-1"
            aria-hidden="true"
          />
        </span>
        <span v-if="folder" class="nui-tree__icon nui-tree__icon--folder" aria-hidden="true">
          <NuiIcon icon="folder" class="nui-tree__glyph nui-tree__glyph--closed" />
          <NuiIcon icon="folder-open" class="nui-tree__glyph nui-tree__glyph--open" />
        </span>
        <NuiIcon v-else-if="icon" :icon="icon" class="nui-tree__icon" />
      </span>
    </template>
    <template v-if="$slots.default" #default="{ selected }">
      <slot
        :item="node.item"
        :level="node.level"
        :expanded="node.expanded"
        :selected="selected"
        :checked="checked ?? 'unchecked'"
        :loading="node.loading"
      />
    </template>
  </NuiListItem>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import NuiCheckbox from '../checkbox/NuiCheckbox.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiListItem from '../list/NuiListItem.vue';
import type { NuiTreeNodeProps } from './tree.types';

const { node, id, checked, icon, folder, revealing } = defineProps<NuiTreeNodeProps<T>>();

const style = computed(() => ({ '--_level': String(node.level) }));
</script>
