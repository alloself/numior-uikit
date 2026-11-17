<template>
  <NuiCheckbox v-model="agreed" description="Без согласия заказ не оформить" required>
    Согласен с условиями доставки
  </NuiCheckbox>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckbox } from '@numior/kit';

const agreed = ref(false);
</script>
