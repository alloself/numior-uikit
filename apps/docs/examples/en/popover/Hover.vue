<template>
  <div class="text-sm">
    The review is led by
    <NuiPopover trigger="hover" placement="bottom-start">
      <template #trigger="{ attrs }">
        <NuiLink v-bind="attrs" href="#reviewer">@anna</NuiLink>
      </template>
      <div class="flex gap-3 w-64">
        <NuiAvatar name="Anna Titova" />
        <div class="flex flex-col gap-1">
          <span class="font-medium">Anna Titova</span>
          <span class="text-muted-foreground">Interface designer, runs forms and tables.</span>
        </div>
      </div>
    </NuiPopover>
    until Friday.
  </div>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiLink, NuiPopover } from '@numior/vue';
</script>
