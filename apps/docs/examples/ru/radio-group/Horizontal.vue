<template>
  <NuiRadioGroup v-model="delivery" label="Доставка" orientation="horizontal" size="sm">
    <NuiRadio value="courier">Курьер</NuiRadio>
    <NuiRadio value="pickup">Самовывоз</NuiRadio>
    <NuiRadio value="post">Почта</NuiRadio>
  </NuiRadioGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/vue';

const delivery = ref('courier');
</script>
