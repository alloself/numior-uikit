<template>
  <div
    :id="id"
    class="nui-tree__item"
    :class="{
      'nui-tree__item--active': active,
      'nui-tree__item--selected': selected,
      'nui-tree__item--disabled': node.item.disabled,
      'nui-tree__item--expanded': node.expanded,
      'nui-tree__item--loading': node.loading,
      'nui-tree__item--revealing': revealing,
    }"
    role="treeitem"
    :aria-level="node.level"
    :aria-setsize="node.setSize"
    :aria-posinset="node.posInSet"
    :aria-expanded="node.hasChildren ? node.expanded : undefined"
    :aria-selected="selectable ? selected : undefined"
    :aria-checked="checkedAttr"
    :aria-disabled="node.item.disabled || undefined"
    :aria-busy="node.loading || undefined"
    :style="style"
  >
    <div class="nui-tree__row">
      <span class="nui-tree__toggle" aria-hidden="true">
        <NuiIcon v-if="node.loading" alias="loader" class="nui-tree__spinner" />
        <NuiIcon v-else-if="node.hasChildren" alias="chevron-right" class="nui-tree__chevron" />
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
        <NuiIcon alias="folder" class="nui-tree__glyph nui-tree__glyph--closed" />
        <NuiIcon alias="folder-open" class="nui-tree__glyph nui-tree__glyph--open" />
      </span>
      <NuiIcon v-else-if="icon" :alias="icon" class="nui-tree__icon" />
      <span class="nui-tree__text">
        <slot
          :item="node.item"
          :level="node.level"
          :expanded="node.expanded"
          :selected="selected"
          :checked="checked ?? 'unchecked'"
          :loading="node.loading"
        >
          <NuiRow :title="node.item.label" :description="node.item.description" inline nowrap />
        </slot>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import NuiCheckbox from '../checkbox/NuiCheckbox.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiRow from '../row/NuiRow.vue';
import type { NuiTreeNodeProps } from './tree.types';

const { node, id, active, selected, selectable, checked, icon, folder, start, revealing } =
  defineProps<NuiTreeNodeProps<T>>();

const checkedAttr = computed(() => {
  if (checked === undefined) {
    return undefined;
  }
  return checked === 'indeterminate' ? 'mixed' : checked === 'checked';
});
const style = computed(() => ({
  '--_level': String(node.level),
  ...(start === undefined ? {} : { '--_start': `${start}px` }),
}));
</script>
