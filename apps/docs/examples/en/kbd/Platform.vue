<template>
  <div class="flex items-center gap-4 text-sm">
    <span>Mac: <NuiKbd keys="mod+alt+arrowup" platform="mac" /></span>
    <span>Windows and Linux: <NuiKbd keys="mod+alt+arrowup" platform="other" /></span>
    <span>Small size: <NuiKbd keys="enter" size="sm" /></span>
  </div>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/vue';
</script>
