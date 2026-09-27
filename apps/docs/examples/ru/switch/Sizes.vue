<template>
  <NuiSwitch v-model="on" size="sm">Компактный</NuiSwitch>
  <NuiSwitch v-model="on">Обычный</NuiSwitch>
  <NuiSwitch v-model="on" size="lg">Крупный</NuiSwitch>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSwitch } from '@numior/vue';

const on = ref(true);
</script>
