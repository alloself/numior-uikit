<template>
  <p class="m-0 text-sm">
    Нажмите <NuiKbd keys="mod+k" /> для поиска, <NuiKbd :keys="['mod+shift+p']" /> для палитры
    команд и <NuiKbd variant="plain">Esc</NuiKbd> для выхода.
  </p>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/vue';
</script>
