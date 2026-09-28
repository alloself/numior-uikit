<template>
  <div class="w-full grid-auto-sm gap-3">
    <div v-for="alias in aliases" :key="alias" class="flex flex-col items-center gap-1">
      <NuiIcon :alias="alias" class="text-lg" />
      <span class="text-xs text-muted-foreground">{{ alias }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuiIcon, type IconAlias } from '@numior/vue';

const aliases: readonly IconAlias[] = [
  'check',
  'minus',
  'loader',
  'chevron-down',
  'x',
  'search',
  'info',
  'success',
  'warning',
  'error',
  'chevron-right',
  'chevron-left',
  'chevrons-left',
  'chevrons-right',
  'ellipsis',
  'external-link',
  'user',
  'image',
  'inbox',
  'folder',
  'folder-open',
  'file',
  'arrow-up',
  'arrow-up-down',
  'grip',
  'plus',
  'clock',
  'calendar',
  'upload',
  'refresh',
  'sidebar',
  'menu',
  'trash',
  'sun',
  'moon',
  'monitor',
  'copy',
  'hash',
  'link',
  'languages',
  'command',
  'arrow-left',
  'arrow-right',
  'code',
  'eye',
  'terminal',
  'chevrons-up-down',
  'chevron-up',
  'smartphone',
  'tablet',
  'maximize',
  'grip-horizontal',
  'direction',
];
</script>
