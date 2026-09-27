<template>
  <NuiCheckbox v-model="terms" description="Без согласия заказ не оформить" required>
    Принимаю условия использования
  </NuiCheckbox>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckbox } from '@numior/vue';

const terms = ref(false);
</script>
