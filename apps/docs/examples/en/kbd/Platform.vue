<template>
  <div class="nui-flex nui-items-center nui-gap-4 nui-text-sm">
    <span>Mac: <NuiKbd keys="mod+alt+arrowup" platform="mac" /></span>
    <span>Windows and Linux: <NuiKbd keys="mod+alt+arrowup" platform="other" /></span>
    <span>Small size: <NuiKbd keys="enter" size="sm" /></span>
  </div>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/vue';
</script>
