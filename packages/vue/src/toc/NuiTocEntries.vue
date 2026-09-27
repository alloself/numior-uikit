<template>
  <ol class="nui-toc__list" :class="`nui-toc__list--depth-${depth}`">
    <li
      v-for="item in items"
      :key="item.id"
      class="nui-toc__item"
      :class="{ 'nui-toc__item--current': item.id === activeId }"
    >
      <a
        class="nui-toc__link"
        :href="`#${item.id}`"
        :aria-current="item.id === activeId ? 'location' : undefined"
        @click="emit('select', item.id)"
        >{{ item.label }}</a
      >
      <NuiTocEntries
        v-if="item.children !== undefined && item.children.length > 0"
        :items="item.children"
        :active-id="activeId"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </li>
  </ol>
</template>

<script setup lang="ts">
import type { NuiTocEntriesProps } from './toc.types';

const { items, activeId, depth } = defineProps<NuiTocEntriesProps>();

const emit = defineEmits<{ select: [id: string] }>();
</script>
