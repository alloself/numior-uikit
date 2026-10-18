<template>
  <span v-if="current" class="nui-breadcrumbs__current" aria-current="page">
    <NuiIcon v-if="item.icon" :icon="item.icon" class="nui-breadcrumbs__icon" />
    {{ item.label }}
  </span>
  <NuiLink
    v-else
    :as="as"
    :href="item.href"
    :to="item.to"
    tone="neutral"
    underline="hover"
    class="nui-breadcrumbs__link"
  >
    <NuiIcon v-if="item.icon" :icon="item.icon" class="nui-breadcrumbs__icon" />
    {{ item.label }}
  </NuiLink>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiLink from '../link/NuiLink.vue';
import type { NuiBreadcrumbItem } from './breadcrumbs.types';

const { item, current, as } = defineProps<{
  item: NuiBreadcrumbItem;
  current: boolean;
  as?: string | Component | undefined;
}>();
</script>
