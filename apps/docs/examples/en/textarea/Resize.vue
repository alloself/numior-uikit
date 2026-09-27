<template>
  <NuiTextarea v-model="note" label="Order comment" resize="none" size="sm" />
  <NuiTextarea v-model="note" label="Free resizing" resize="both" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/vue';

const note = ref('Call an hour before the delivery.');
</script>
