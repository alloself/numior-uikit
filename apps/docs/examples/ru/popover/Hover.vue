<template>
  <div class="text-sm">
    Ревью проводит
    <NuiPopover trigger="hover" placement="bottom-start">
      <template #trigger="{ attrs }">
        <NuiLink v-bind="attrs" href="#reviewer">@anna</NuiLink>
      </template>
      <div class="flex gap-3 w-64">
        <NuiAvatar name="Анна Титова" />
        <div class="flex flex-col gap-1">
          <span class="font-medium">Анна Титова</span>
          <span class="text-muted-foreground">Дизайнер интерфейсов, ведёт формы и таблицы.</span>
        </div>
      </div>
    </NuiPopover>
    до пятницы.
  </div>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiLink, NuiPopover } from '@numior/vue';
</script>
