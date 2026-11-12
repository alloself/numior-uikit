<template>
  <NuiInput
    v-model="email"
    type="email"
    label="Почта покупателя"
    description="Пришлём на неё чек и трек-номер"
    placeholder="volkov@example.com"
    autocomplete="email"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const email = ref('');
</script>
