<template>
  <NuiCard href="#anatomy" class="nui-max-w-sm">
    <NuiCardHeader>
      <NuiCardTitle>Анатомия карточки</NuiCardTitle>
      <NuiCardDescription
        >Вся карточка ведёт к разделу, кнопка в шапке живёт отдельно.</NuiCardDescription
      >
      <template #actions>
        <NuiButton variant="ghost" tone="neutral" size="sm" aria-label="Ещё">
          <NuiIcon alias="ellipsis" />
        </NuiButton>
      </template>
    </NuiCardHeader>
    <NuiCardFooter>
      <NuiBadge tone="success">Доступно</NuiBadge>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import {
  NuiBadge,
  NuiButton,
  NuiCard,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiIcon,
} from '@numior/vue';
</script>
