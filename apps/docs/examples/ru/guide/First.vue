<template>
  <form class="flex flex-col gap-3 max-w-sm" @submit.prevent="saved = true">
    <NuiInput v-model="name" label="Имя" description="Как к вам обращаться" />
    <div class="flex items-center gap-3">
      <NuiButton type="submit">Сохранить</NuiButton>
      <span v-if="saved">Имя «{{ name }}» сохранено.</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput } from '@numior/vue';

const name = ref('');
const saved = ref(false);
</script>
