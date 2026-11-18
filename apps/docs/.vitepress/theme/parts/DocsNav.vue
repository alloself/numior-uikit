<template>
  <nav :aria-label="label" class="flex min-w-0 items-center gap-1 font-normal">
    <ul
      ref="row"
      class="m-0 flex max-h-(--spacing-control-sm) min-w-0 list-none flex-wrap gap-x-1 overflow-hidden p-0"
    >
      <li
        v-for="(item, index) in items"
        :key="item.link"
        :inert="index >= shown || undefined"
        :class="{ invisible: index >= shown }"
      >
        <NuiButton
          :href="item.link"
          :variant="item.current ? 'soft' : 'ghost'"
          tone="neutral"
          size="sm"
          :aria-current="item.current ? 'page' : undefined"
          >{{ item.text }}</NuiButton
        >
      </li>
    </ul>
    <NuiMenu v-if="overflow.length > 0" :label="moreLabel" placement="bottom-end">
      <template #trigger="{ attrs }">
        <NuiButton v-bind="attrs" variant="ghost" tone="neutral" size="sm" icon-end="chevron-down">
          {{ moreLabel }}
        </NuiButton>
      </template>
      <NuiMenuItem v-for="item in overflow" :key="item.link" :href="item.link">
        {{ item.text }}
        <template v-if="item.current" #trailing>
          <NuiIcon icon="check" />
        </template>
      </NuiMenuItem>
    </NuiMenu>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { NuiButton, NuiIcon, NuiMenu, NuiMenuItem } from '@numior/vue';
import type { DocsNavProps } from '../theme.types';

const { items, label, moreLabel } = defineProps<DocsNavProps>();

const row = useTemplateRef<HTMLElement>('row');
const shown = ref(items.length);

const overflow = computed(() => items.slice(shown.value));

const measure = (): void => {
  const cells = [...(row.value?.children ?? [])];
  const first = cells[0];

  if (!(first instanceof HTMLElement)) {
    return;
  }

  const wrapped = cells.findIndex(
    (cell) => cell instanceof HTMLElement && cell.offsetTop > first.offsetTop,
  );

  shown.value = wrapped === -1 ? cells.length : wrapped;
};

useResizeObserver(row, measure);
onMounted(measure);
watch(() => items.length, measure, { flush: 'post' });
</script>
