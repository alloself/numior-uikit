<template>
  <NuiTextarea
    v-model="comment"
    label="Комментарий к заказу"
    description="Курьер прочитает его перед выездом"
    :rows="4"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/vue';

const comment = ref('Позвоните за час до доставки: домофон не работает.');
</script>
