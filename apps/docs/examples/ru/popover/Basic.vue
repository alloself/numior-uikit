<template>
  <NuiPopover placement="bottom-start" arrow>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral" icon="user">Пётр Волков</NuiButton>
    </template>
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <NuiAvatar name="Пётр Волков" />
        <div class="flex flex-col">
          <span class="font-medium">Пётр Волков</span>
          <span class="text-sm text-muted-foreground">Москва, 14 заказов на 186 400 ₽</span>
        </div>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <NuiLink href="mailto:volkov@example.com">volkov@example.com</NuiLink>
        <span>+7 900 000-01-01</span>
      </div>
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiButton, NuiLink, NuiPopover } from '@numior/kit';
</script>
