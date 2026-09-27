<template>
  <NuiMenu>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Файл</NuiButton>
    </template>
    <NuiMenuItem icon="file" shortcut="mod+n" @select="last = 'Новый'">Новый документ</NuiMenuItem>
    <NuiMenuItem icon="copy" shortcut="mod+d" @select="last = 'Дубликат'">Дублировать</NuiMenuItem>
    <NuiMenuSeparator />
    <NuiMenuLabel>Вид</NuiMenuLabel>
    <NuiMenuCheckboxItem v-model:checked="grid">Сетка</NuiMenuCheckboxItem>
    <NuiMenuRadioGroup v-model="sort">
      <NuiMenuRadioItem value="name">По имени</NuiMenuRadioItem>
      <NuiMenuRadioItem value="date">По дате</NuiMenuRadioItem>
    </NuiMenuRadioGroup>
    <NuiMenuSeparator />
    <NuiMenuSub label="Экспорт" icon="upload">
      <NuiMenuItem @select="last = 'PDF'">PDF</NuiMenuItem>
      <NuiMenuItem @select="last = 'CSV'">CSV</NuiMenuItem>
    </NuiMenuSub>
    <NuiMenuItem icon="trash" tone="error" @select="last = 'Удалить'">Удалить</NuiMenuItem>
  </NuiMenu>
  <p class="nui-text-sm nui-text-muted">
    Показываем {{ grid ? 'сеткой' : 'списком' }}, сортировка
    {{ sort === 'name' ? 'по имени' : 'по дате' }}.
    <template v-if="last">Последнее действие: {{ last }}.</template>
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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

const last = ref('');
const grid = ref(true);
const sort = ref('name');
</script>
