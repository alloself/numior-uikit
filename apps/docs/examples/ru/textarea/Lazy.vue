<template>
  <NuiTextarea
    v-model.lazy.trim="answer"
    label="Ответ клиенту"
    :description="`Сохранено символов: ${answer.length}`"
    :rows="3"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/vue';

const answer = ref('');
</script>
