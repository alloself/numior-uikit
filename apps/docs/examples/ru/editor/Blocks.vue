<template>
  <div class="w-full">
    <NuiEditor v-model="guide" aria-label="Уход за мебелью" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor } from '@numior/editor-vue';

const guide = ref(`
<h2>Уход за мебелью</h2>
<p>Памятка уходит покупателю вместе с заказом.</p>
<h3>В первую неделю</h3>
<ul>
  <li><input type="checkbox" checked> Снимите плёнку с ножек</li>
  <li><input type="checkbox"> Проветрите комнату: запах ткани уйдёт за пару дней</li>
  <li><input type="checkbox"> Подтяните винты через семь дней</li>
</ul>
<div class="nui-content__callout nui-content__callout--tone-warning">
  <p>Не ставьте мебель из дуба вплотную к батарее: дерево рассыхается.</p>
</div>
<h3>Чистка обивки</h3>
<div class="nui-content__columns">
  <div class="nui-content__column">
    <h4>Ткань</h4>
    <p>Пылесосьте раз в неделю мягкой насадкой. Пятно промокните влажной салфеткой, не трите.</p>
  </div>
  <div class="nui-content__column">
    <h4>Кожа</h4>
    <p>Протирайте сухой мягкой тканью. Раз в полгода наносите крем для кожи.</p>
  </div>
</div>
<details>
  <summary>Если появилась царапина</summary>
  <p>Закрасьте её восковым карандашом в тон дерева и отполируйте сухой тканью.</p>
</details>
`);
</script>
