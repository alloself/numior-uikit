<template>
  <p class="nui-m-0 nui-text-sm">
    Нажмите <NuiKbd keys="mod+k" /> для поиска, <NuiKbd :keys="['mod+shift+p']" /> для палитры
    команд и <NuiKbd variant="plain">Esc</NuiKbd> для выхода.
  </p>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/vue';
</script>
