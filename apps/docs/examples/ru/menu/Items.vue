<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <div class="flex items-center justify-between gap-3 text-sm">
      <span>Заказ 20411, Нина Зайцева</span>
      <NuiMenu :items="entries" placement="bottom-end" label="Действия с заказом 20411">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            icon="ellipsis"
            aria-label="Действия с заказом 20411"
          />
        </template>
      </NuiMenu>
    </div>
    <p class="m-0 text-sm text-muted-foreground">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/kit';

const status = ref('Заказ ждёт оплаты.');

const entries: NuiMenuEntry[] = [
  { label: 'Открыть заказ', icon: 'eye', href: '#order-20411' },
  {
    label: 'Напомнить об оплате',
    icon: 'inbox',
    onSelect: () => {
      status.value = 'Напоминание об оплате ушло покупателю.';
    },
  },
  { type: 'separator' },
  {
    label: 'Отменить заказ',
    icon: 'trash',
    tone: 'error',
    onSelect: () => {
      status.value = 'Заказ 20411 отменён.';
    },
  },
];
</script>
