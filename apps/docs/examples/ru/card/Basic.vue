<template>
  <NuiCard class="nui-max-w-sm">
    <NuiCardHeader>
      <NuiCardTitle>Тариф Team</NuiCardTitle>
      <NuiCardDescription>Для команд до десяти человек.</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>Общие проекты, роли и история изменений.</NuiCardContent>
    <NuiCardFooter>
      <NuiButton size="sm">Выбрать</NuiButton>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import {
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/vue';
</script>
