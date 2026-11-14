<template>
  <NuiCard class="w-full max-w-sm">
    <NuiCardHeader>
      <NuiCardTitle>Заказ 20408</NuiCardTitle>
      <NuiCardDescription>Павел Соколов, Москва</NuiCardDescription>
      <template #actions>
        <NuiBadge tone="info">В доставке</NuiBadge>
      </template>
    </NuiCardHeader>
    <NuiCardContent>Комод «Фьорд» и лампа «Нурд» на 26 800 ₽.</NuiCardContent>
    <NuiCardFooter>
      <NuiButton size="sm">Открыть заказ</NuiButton>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import {
  NuiBadge,
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/vue';
</script>
