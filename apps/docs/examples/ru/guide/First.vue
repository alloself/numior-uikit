<template>
  <form class="nui-flex nui-flex-col nui-gap-3 nui-max-w-sm" @submit.prevent="saved = true">
    <NuiInput v-model="name" label="Имя" description="Как к вам обращаться" />
    <div class="nui-flex nui-items-center nui-gap-3">
      <NuiButton type="submit">Сохранить</NuiButton>
      <span v-if="saved">Сохранено: {{ name }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput } from '@numior/vue';

const name = ref('');
const saved = ref(false);
</script>
