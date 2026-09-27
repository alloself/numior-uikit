<template>
  <NuiTextarea v-model="note" label="Комментарий к заказу" resize="none" size="sm" />
  <NuiTextarea v-model="note" label="Свободный размер" resize="both" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/vue';

const note = ref('Позвонить за час до доставки.');
</script>
