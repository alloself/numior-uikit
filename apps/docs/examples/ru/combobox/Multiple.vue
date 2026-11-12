<template>
  <NuiCombobox
    v-model:values="tags"
    :options="options"
    :custom-value="(text) => text"
    label="Теги товара"
    description="Enter добавит новый тег"
    multiple
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOptionSource } from '@numior/vue';

const tags = ref(['new', 'sale']);

const options: NuiOptionSource<string> = [
  { value: 'new', label: 'Новинка' },
  { value: 'sale', label: 'Скидка' },
  { value: 'preorder', label: 'Под заказ' },
  { value: 'bestseller', label: 'Хит продаж' },
];
</script>
