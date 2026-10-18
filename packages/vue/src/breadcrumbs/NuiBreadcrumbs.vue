<template>
  <nav class="nui-breadcrumbs" :aria-label="labelText">
    <ol class="nui-breadcrumbs__list">
      <li v-for="(entry, position) in entries" :key="entry.key" class="nui-breadcrumbs__item">
        <NuiMenu v-if="entry.kind === 'more'" :items="entry.menu" :label="moreText">
          <template #trigger="{ attrs }">
            <NuiButton
              v-bind="attrs"
              variant="ghost"
              tone="neutral"
              size="sm"
              class="nui-breadcrumbs__more"
              :aria-label="moreText"
              icon="ellipsis"
            />
          </template>
        </NuiMenu>
        <slot v-else name="item" :item="entry.item" :index="entry.index" :current="entry.current">
          <NuiBreadcrumbCrumb :item="entry.item" :current="entry.current" :as="as" />
        </slot>
        <NuiIcon
          v-if="position < entries.length - 1"
          :icon="separator"
          class="nui-breadcrumbs__separator"
        />
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMessages } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiMenu from '../menu/NuiMenu.vue';
import NuiBreadcrumbCrumb from './NuiBreadcrumbCrumb.vue';
import { layoutBreadcrumbs } from './breadcrumbs-layout';
import { breadcrumbsMessages } from './breadcrumbs.messages';
import type { NuiBreadcrumbsItemSlot, NuiBreadcrumbsProps } from './breadcrumbs.types';

const {
  items,
  maxItems,
  separator = 'chevron-right',
  label,
  moreLabel,
  as,
} = defineProps<NuiBreadcrumbsProps>();

defineSlots<{ item(props: NuiBreadcrumbsItemSlot): unknown }>();

const messages = useMessages(breadcrumbsMessages);

const labelText = computed(() => label ?? messages.value.label);
const moreText = computed(() => moreLabel ?? messages.value.more);
const entries = computed(() => layoutBreadcrumbs(items, maxItems, as));
</script>
