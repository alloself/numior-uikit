<template>
  <div
    class="nui-avatar-group"
    :class="`nui-avatar-group--size-${size}`"
    role="group"
    :aria-label="label"
  >
    <template v-if="items">
      <NuiAvatar
        v-for="(item, index) in visibleItems"
        :key="item.key ?? index"
        :src="item.src"
        :alt="item.alt"
        :name="item.name"
      />
    </template>
    <template v-else>
      <component :is="child" v-for="(child, index) in sliced().visible" :key="index" />
    </template>
    <NuiAvatar v-if="hidden > 0" class="nui-avatar-group__overflow" :alt="overflowText">
      {{ overflowText }}
    </NuiAvatar>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import NuiAvatar from './NuiAvatar.vue';
import { provideAvatarGroup } from './avatar-context';
import { sliceChildren } from './avatar-group-children';
import type { NuiAvatarGroupProps } from './avatar.types';

const {
  items,
  max,
  size = 'md',
  shape = 'circle',
  label,
  overflowLabel = undefined,
} = defineProps<NuiAvatarGroupProps>();

const slots = useSlots();
provideAvatarGroup({
  size: computed(() => size),
  shape: computed(() => shape),
});

const visibleItems = computed(() => {
  if (!items) {
    return [];
  }
  return max === undefined ? items : items.slice(0, Math.max(0, max));
});
const sliced = () => sliceChildren(slots.default, max);
const hidden = computed(() => (items ? items.length - visibleItems.value.length : sliced().hidden));
const overflowText = computed(() =>
  overflowLabel === undefined ? `+${hidden.value}` : overflowLabel(hidden.value),
);
</script>
