<template>
  <NuiInput v-model="name" label="Name" placeholder="Anna Titova" autocomplete="name" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const name = ref('');
</script>
