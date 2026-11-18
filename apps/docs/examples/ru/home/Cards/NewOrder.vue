<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Новый заказ</NuiCardTitle>
      <NuiCardDescription>Клиент получит письмо с номером заказа</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent class="flex flex-col gap-4">
      <NuiSelect v-model="customer" :options="customerOptions" label="Клиент" />
      <NuiRadioGroup v-model="delivery" label="Доставка">
        <NuiRadio v-for="option in deliveryOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </NuiRadio>
      </NuiRadioGroup>
      <NuiTextarea v-model="comment" label="Комментарий" placeholder="Позвонить за час" />
    </NuiCardContent>
    <NuiCardFooter class="flex justify-end gap-2">
      <NuiButton variant="outline" tone="neutral">Отмена</NuiButton>
      <NuiButton>Создать заказ</NuiButton>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiRadio,
  NuiRadioGroup,
  NuiSelect,
  NuiTextarea,
} from '@numior/kit';
import { customers } from '#demo/customers';
import { DELIVERIES } from '#demo/orders';

const customerOptions = customers.map((person) => ({ value: person.id, label: person.name }));

const deliveryOptions = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));

const customer = ref<number | null>(customers[0]?.id ?? null);
const delivery = ref('courier');
const comment = ref('');
</script>
