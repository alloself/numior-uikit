<template>
  <NuiTimeField v-model="time" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const time = ref<string | null>('10:00');
</script>
