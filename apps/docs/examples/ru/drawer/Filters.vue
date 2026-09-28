<template>
  <NuiButton variant="outline" @click="open = true">Фильтры</NuiButton>
  <NuiDrawer v-model:open="open" title="Фильтры" description="Настройки списка заказов">
    <div class="flex flex-col gap-3">
      <NuiInput v-model="query" label="Клиент" placeholder="Имя или компания" />
      <NuiSelect v-model="status" :options="statuses" label="Статус" clearable />
      <NuiSwitch v-model="onlyMine">Только мои заказы</NuiSwitch>
    </div>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Сбросить</NuiButton>
      <NuiButton @click="open = false">Применить</NuiButton>
    </template>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDrawer, NuiInput, NuiSelect, NuiSwitch } from '@numior/vue';

const open = ref(false);
const query = ref('');
const status = ref<string | null>(null);
const onlyMine = ref(true);

const statuses = [
  { value: 'paid', label: 'Оплачен' },
  { value: 'pending', label: 'Ждёт оплаты' },
  { value: 'cancelled', label: 'Отменён' },
];
</script>
