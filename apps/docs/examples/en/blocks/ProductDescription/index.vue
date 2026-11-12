<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-4 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">Product description</h1>
      <p class="m-0 text-sm text-muted-foreground">Type "/" on an empty line to insert a block</p>
    </div>
    <NuiEditor
      v-model="document"
      format="json"
      toolbar="both"
      aria-label="Product description"
      placeholder="Describe the product"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { contentSchema } from '@numior/content';
import { fromHTML, toJSON } from '@numior/editor-core';
import { NuiEditor } from '@numior/editor-vue';
import { description } from '#demo/description';

const document = ref(toJSON(fromHTML(contentSchema, description)));
</script>
