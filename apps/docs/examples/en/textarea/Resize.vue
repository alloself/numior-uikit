<template>
  <NuiTextarea v-model="reply" label="Reply to the review" resize="both" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/vue';

const reply = ref('Thank you for the review! A new pillow arrives on Friday.');
</script>
