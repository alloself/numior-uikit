<template>
  <div class="w-full">
    <NuiEditor v-model="document" aria-label="Обивка кресла «Осло»" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor } from '@numior/kit/editor';

const document = ref(`
<h3>Обивка кресла «Осло»</h3>
<table>
  <thead>
    <tr><th>Ткань</th><th>Цена, ₽</th><th>Поставка</th><th>В наличии</th></tr>
  </thead>
  <tbody>
    <tr><td>Серый лён</td><td>18900</td><td>2026-11-20</td><td>да</td></tr>
    <tr><td>Тёмный лён</td><td>19400</td><td>2026-11-24</td><td>да</td></tr>
    <tr><td>Синий велюр</td><td>21500</td><td>2026-12-03</td><td>нет</td></tr>
    <tr><td>Горчичный велюр</td><td>21500</td><td>2026-12-10</td><td>нет</td></tr>
  </tbody>
</table>
`);
</script>
