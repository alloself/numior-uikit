<template>
  <NuiTextarea v-model="reply" label="Ответ на отзыв" resize="both" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/kit';

const reply = ref('Спасибо за отзыв! Новую подушку привезём в пятницу.');
</script>
