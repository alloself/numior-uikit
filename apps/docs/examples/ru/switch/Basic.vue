<template>
  <NuiSwitch
    v-model="visible"
    description="Покупатель увидит их в каталоге с пометкой «Нет на складе»"
  >
    Показывать товары не в наличии
  </NuiSwitch>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSwitch } from '@numior/vue';

const visible = ref(true);
</script>
