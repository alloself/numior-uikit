<template>
  <NuiPopover placement="bottom-start" arrow>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral" icon="user">Peter Wolfe</NuiButton>
    </template>
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <NuiAvatar name="Peter Wolfe" />
        <div class="flex flex-col">
          <span class="font-medium">Peter Wolfe</span>
          <span class="text-sm text-muted-foreground">Boston, 14 orders worth $2,480</span>
        </div>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <NuiLink href="mailto:peter.wolfe@example.com">peter.wolfe@example.com</NuiLink>
        <span>(617) 555-0101</span>
      </div>
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiButton, NuiLink, NuiPopover } from '@numior/kit';
</script>
