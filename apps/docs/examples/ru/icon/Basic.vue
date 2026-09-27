<template>
  <div class="nui-w-full nui-grid-auto-sm nui-gap-3">
    <div
      v-for="alias in aliases"
      :key="alias"
      class="nui-flex nui-flex-col nui-items-center nui-gap-1"
    >
      <NuiIcon :alias="alias" class="nui-text-lg" />
      <span class="nui-text-xs nui-text-muted">{{ alias }}</span>
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
