<template>
  <NuiInput v-model="login" label="Логин" autocomplete="username">
    <template #prefix>@</template>
  </NuiInput>
  <NuiInput v-model="site" label="Сайт" description="Домен без протокола">
    <template #suffix>.ru</template>
  </NuiInput>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const login = ref('titova');
const site = ref('numior');
</script>
