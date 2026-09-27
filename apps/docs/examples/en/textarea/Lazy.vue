<template>
  <NuiTextarea
    v-model.lazy.trim="answer"
    label="Reply to the customer"
    :description="`Saved characters: ${answer.length}`"
    :rows="3"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/vue';

const answer = ref('');
</script>
