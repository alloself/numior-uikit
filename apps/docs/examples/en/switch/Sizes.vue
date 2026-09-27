<template>
  <NuiSwitch v-model="on" size="sm">Compact</NuiSwitch>
  <NuiSwitch v-model="on">Regular</NuiSwitch>
  <NuiSwitch v-model="on" size="lg">Large</NuiSwitch>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSwitch } from '@numior/vue';

const on = ref(true);
</script>
