<template>
  <div class="flex flex-col items-start gap-3">
    <NuiMenu>
      <template #trigger="{ attrs }">
        <NuiButton v-bind="attrs" variant="outline" tone="neutral" icon-end="chevron-down">
          Действия
        </NuiButton>
      </template>
      <NuiMenuItem icon="copy" shortcut="mod+d" @select="done = 'Копия заказа 20408 создана.'">
        Дублировать
      </NuiMenuItem>
      <NuiMenuItem :icon="Printer" shortcut="mod+p" @select="done = 'Накладная ушла на печать.'">
        Распечатать накладную
      </NuiMenuItem>
      <NuiMenuSub label="Отправить покупателю" icon="inbox">
        <NuiMenuItem @select="done = 'Счёт ушёл покупателю на почту.'">Счёт</NuiMenuItem>
        <NuiMenuItem @select="done = 'Ссылка на оплату ушла в SMS.'">Ссылку на оплату</NuiMenuItem>
      </NuiMenuSub>
      <NuiMenuSeparator />
      <NuiMenuLabel>Доставка</NuiMenuLabel>
      <NuiMenuRadioGroup v-model="delivery">
        <NuiMenuRadioItem v-for="method in methods" :key="method.value" :value="method.value">
          {{ method.label }}
        </NuiMenuRadioItem>
      </NuiMenuRadioGroup>
      <NuiMenuSeparator />
      <NuiMenuCheckboxItem v-model:checked="letters">Письма о статусе</NuiMenuCheckboxItem>
      <NuiMenuSeparator />
      <NuiMenuItem icon="trash" tone="error" @select="done = 'Заказ 20408 отменён.'">
        Отменить заказ
      </NuiMenuItem>
    </NuiMenu>
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Printer } from '@lucide/vue';
import {
  NuiButton,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
} from '@numior/vue';
import { DELIVERIES } from '#demo/orders';

const delivery = ref('courier');
const letters = ref(true);
const done = ref('');

const methods = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));

const summary = computed(() => {
  const method = methods.find((entry) => entry.value === delivery.value)?.label ?? '';
  const status = letters.value ? 'с письмами о статусе' : 'без писем о статусе';

  return `${method}, ${status}. ${done.value}`.trim();
});
</script>
