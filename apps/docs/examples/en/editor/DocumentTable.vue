<template>
  <div class="w-full">
    <NuiEditor v-model="document" aria-label="Oslo armchair upholstery" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor } from '@numior/editor-vue';

const document = ref(`
<h3>Oslo armchair upholstery</h3>
<table>
  <thead>
    <tr><th>Fabric</th><th>Price, $</th><th>Delivery</th><th>In stock</th></tr>
  </thead>
  <tbody>
    <tr><td>Gray linen</td><td>249</td><td>2026-11-20</td><td>yes</td></tr>
    <tr><td>Dark linen</td><td>259</td><td>2026-11-24</td><td>yes</td></tr>
    <tr><td>Blue velvet</td><td>289</td><td>2026-12-03</td><td>no</td></tr>
    <tr><td>Mustard velvet</td><td>289</td><td>2026-12-10</td><td>no</td></tr>
  </tbody>
</table>
`);
</script>
