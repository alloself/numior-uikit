<template>
  <NuiInput v-model="login" label="Login" autocomplete="username">
    <template #prefix>@</template>
  </NuiInput>
  <NuiInput v-model="site" label="Site" description="Domain without the protocol">
    <template #suffix>.com</template>
  </NuiInput>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const login = ref('titova');
const site = ref('numior');
</script>
