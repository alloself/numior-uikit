<template>
  <div class="w-full">
    <NuiEditor
      v-model="document"
      toolbar="both"
      aria-label="Product description"
      placeholder="Describe the product"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor } from '@numior/editor-vue';
import { description } from '#demo/description';

const document = ref(description);
</script>
