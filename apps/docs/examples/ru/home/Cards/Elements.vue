<template>
  <NuiCard>
    <NuiCardContent class="flex flex-col gap-5">
      <div class="flex flex-wrap gap-2">
        <NuiButton>Купить</NuiButton>
        <NuiButton variant="soft">В корзину</NuiButton>
        <NuiButton variant="outline" tone="neutral" :icon="Heart" aria-label="В избранное" />
      </div>
      <div class="flex flex-wrap gap-2">
        <NuiBadge v-for="status in statuses" :key="status" :tone="STATUS_TONES[status]">
          {{ ORDER_STATUSES[status] }}
        </NuiBadge>
      </div>
      <NuiToggleGroup
        v-model="filter"
        :items="filters"
        variant="segmented"
        required
        label="Какие товары показать"
      />
      <NuiInput
        v-model="query"
        type="search"
        placeholder="Кресло, лампа или артикул"
        aria-label="Найти товар"
      >
        <template #prefix><NuiIcon icon="search" /></template>
      </NuiInput>
      <div class="flex flex-wrap gap-2">
        <NuiChip v-for="tag in tags" :key="tag" removable @remove="drop(tag)">{{ tag }}</NuiChip>
      </div>
      <div class="flex flex-col gap-3">
        <NuiCheckbox v-model="gift">Подарочная упаковка</NuiCheckbox>
        <NuiSwitch v-model="lift">Подъём на этаж</NuiSwitch>
      </div>
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Heart } from '@lucide/vue';
import {
  NuiBadge,
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCheckbox,
  NuiChip,
  NuiIcon,
  NuiInput,
  NuiSwitch,
  NuiToggleGroup,
  type NuiToggleItem,
  type NuiTone,
} from '@numior/kit';
import { ORDER_STATUSES, type OrderStatus } from '#demo/orders';

const STATUS_TONES: Record<OrderStatus, NuiTone> = {
  pending: 'warning',
  paid: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

const statuses: readonly OrderStatus[] = ['paid', 'shipped', 'delivered', 'cancelled'];

const filters: readonly NuiToggleItem[] = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новинки' },
  { value: 'sale', label: 'Скидки' },
];

const filter = ref<string | null>('all');
const query = ref('');
const tags = ref(['Дуб', 'Лён', 'Ручная работа']);
const gift = ref(true);
const lift = ref(false);

const drop = (tag: string): void => {
  tags.value = tags.value.filter((name) => name !== tag);
};
</script>
