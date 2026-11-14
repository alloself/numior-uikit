<template>
  <NuiEmpty
    title="Заказов пока нет"
    description="Заказы с сайта появятся здесь сами, а заказ по телефону создайте вручную."
  >
    <template #actions>
      <NuiButton size="sm" icon="plus">Создать заказ</NuiButton>
    </template>
  </NuiEmpty>
</template>

<script setup lang="ts">
import { NuiButton, NuiEmpty } from '@numior/vue';
</script>
