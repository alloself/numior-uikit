<template>
  <div :dir="dir">
    <NuiBreadcrumbs
      :items="crumbs"
      :max-items="maxItems"
      :as="viaRouter ? RouterStub : undefined"
      :label="label"
    >
      <template v-if="customItems" #item="{ item, index, current }">
        <em class="custom-crumb">{{ index }}:{{ item.label }}{{ current ? '*' : '' }}</em>
      </template>
    </NuiBreadcrumbs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '../../src';
import { RouterStub } from '../support/router-stub';

const { items, maxItems, customItems, viaRouter, dir, label } = defineProps<{
  items: readonly NuiBreadcrumbItem[];
  maxItems?: number | undefined;
  customItems: boolean;
  viaRouter: boolean;
  dir: 'ltr' | 'rtl';
  label?: string | undefined;
}>();

const crumbs = computed(() =>
  viaRouter ? items.map((item) => ({ ...item, to: item.href })) : items,
);
</script>
