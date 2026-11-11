<template>
  <NuiButton @click="sent = true">{{ sent ? 'Отправлено' : 'Отправить' }}</NuiButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton } from '@numior/vue';

const sent = ref(false);
</script>
