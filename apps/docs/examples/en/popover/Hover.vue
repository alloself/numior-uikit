<template>
  <div class="text-sm">
    Order 20401 is handled by
    <NuiPopover trigger="hover" placement="bottom-start">
      <template #trigger="{ attrs }">
        <NuiLink v-bind="attrs" href="mailto:anna@example.com">Anna Turner</NuiLink>
      </template>
      <div class="flex items-center gap-3">
        <NuiAvatar name="Anna Turner" />
        <div class="flex flex-col">
          <span class="font-medium">Anna Turner</span>
          <span class="text-muted-foreground">Order manager</span>
          <span class="text-muted-foreground">anna@example.com</span>
        </div>
      </div>
    </NuiPopover>
  </div>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiLink, NuiPopover } from '@numior/vue';
</script>
