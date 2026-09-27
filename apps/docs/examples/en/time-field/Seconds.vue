<template>
  <NuiTimeField v-model="lap" label="Best lap" seconds hour-cycle="h23" :step="1" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const lap = ref<string | null>('01:32:48');
</script>
