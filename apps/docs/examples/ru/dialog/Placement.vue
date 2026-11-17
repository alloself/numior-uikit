<template>
  <NuiButton variant="outline" @click="open = true">Новый товар</NuiButton>
  <NuiDialog v-model:open="open" placement="top" size="lg" title="Новый товар">
    <div class="flex flex-col gap-3">
      <NuiInput v-model="name" label="Название" placeholder="Стул «Берген»" />
      <NuiTextarea v-model="details" label="Описание" :rows="3" />
      <NuiSwitch v-model="custom">Изготовление под заказ</NuiSwitch>
      <NuiNumberField v-if="custom" v-model="days" label="Срок изготовления, дней" :min="1" />
    </div>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Отмена</NuiButton>
      <NuiButton @click="open = false">Создать</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiDialog,
  NuiInput,
  NuiNumberField,
  NuiSwitch,
  NuiTextarea,
} from '@numior/kit';

const open = ref(false);
const name = ref('');
const details = ref('');
const custom = ref(false);
const days = ref<number | null>(14);
</script>
