<template>
  <nav class="nui-breadcrumbs" :aria-label="label">
    <ol class="nui-breadcrumbs__list">
      <li v-for="(entry, position) in entries" :key="entry.key" class="nui-breadcrumbs__item">
        <NuiMenu v-if="entry.kind === 'more'" :items="entry.menu" :label="moreLabel">
          <template #trigger="{ attrs }">
            <NuiButton
              v-bind="attrs"
              variant="ghost"
              tone="neutral"
              size="sm"
              class="nui-breadcrumbs__more"
              :aria-label="moreLabel"
            >
              <NuiIcon alias="ellipsis" />
            </NuiButton>
          </template>
        </NuiMenu>
        <slot v-else name="item" :item="entry.item" :index="entry.index" :current="entry.current">
          <NuiBreadcrumbCrumb :item="entry.item" :current="entry.current" :as="as" />
        </slot>
        <NuiIcon
          v-if="position < entries.length - 1"
          :alias="separator"
          class="nui-breadcrumbs__separator"
        />
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiMenu from '../menu/NuiMenu.vue';
import NuiBreadcrumbCrumb from './NuiBreadcrumbCrumb.vue';
import { layoutBreadcrumbs } from './breadcrumbs-layout';
import type { NuiBreadcrumbsItemSlot, NuiBreadcrumbsProps } from './breadcrumbs.types';

const {
  items,
  maxItems,
  separator = 'chevron-right',
  label = 'Breadcrumb',
  moreLabel = 'Show path',
  as = 'a',
} = defineProps<NuiBreadcrumbsProps>();

defineSlots<{ item(props: NuiBreadcrumbsItemSlot): unknown }>();

const entries = computed(() => layoutBreadcrumbs(items, maxItems, as));
</script>
