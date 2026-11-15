<template>
  <NuiBreadcrumbs :items="path" label="Путь к заказу">
    <template #item="{ item, current }">
      <span
        v-if="current"
        class="flex items-center gap-2 font-medium text-foreground"
        aria-current="page"
      >
        {{ item.label }}
        <NuiBadge tone="info" size="sm">{{ ORDER_STATUSES.shipped }}</NuiBadge>
      </span>
      <NuiLink v-else :href="item.href" tone="neutral" underline="hover">{{ item.label }}</NuiLink>
    </template>
  </NuiBreadcrumbs>
</template>

<script setup lang="ts">
import { NuiBadge, NuiBreadcrumbs, NuiLink, type NuiBreadcrumbItem } from '@numior/vue';
import { ORDER_STATUSES } from '#demo/orders';

const path: NuiBreadcrumbItem[] = [
  { label: 'Покупатели', href: '#' },
  { label: 'Павел Соколов', href: '#' },
  { label: 'Заказ 20408' },
];
</script>
