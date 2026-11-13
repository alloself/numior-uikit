<template>
  <div class="w-full">
    <NuiEditor v-model="document" aria-label="Описание товара" placeholder="Расскажите о товаре" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor } from '@numior/editor-vue';
import { description } from '#demo/description';

const document = ref(description);
</script>
