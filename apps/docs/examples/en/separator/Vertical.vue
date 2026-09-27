<template>
  <div class="nui-flex nui-items-center nui-gap-3">
    <NuiButton variant="ghost" tone="neutral" size="sm">File</NuiButton>
    <NuiSeparator orientation="vertical" />
    <NuiButton variant="ghost" tone="neutral" size="sm">Edit</NuiButton>
    <NuiSeparator orientation="vertical" decorative />
    <NuiKbd keys="mod+s" size="sm" />
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiKbd, NuiSeparator } from '@numior/vue';
</script>
