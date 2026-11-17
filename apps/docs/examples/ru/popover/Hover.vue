<template>
  <div class="text-sm">
    Заказ 20401 ведёт
    <NuiPopover trigger="hover" placement="bottom-start">
      <template #trigger="{ attrs }">
        <NuiLink v-bind="attrs" href="mailto:anna@example.com">Анна Титова</NuiLink>
      </template>
      <div class="flex items-center gap-3">
        <NuiAvatar name="Анна Титова" />
        <div class="flex flex-col">
          <span class="font-medium">Анна Титова</span>
          <span class="text-muted-foreground">Менеджер заказов</span>
          <span class="text-muted-foreground">anna@example.com</span>
        </div>
      </div>
    </NuiPopover>
  </div>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiLink, NuiPopover } from '@numior/kit';
</script>
