<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Product description</NuiCardTitle>
      <NuiCardDescription>Type “/” on an empty line to insert a block</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiEditor
        v-model="document"
        format="json"
        aria-label="Product description"
        placeholder="Tell buyers about the product"
      />
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/kit';
import { contentSchema } from '@numior/kit/content';
import { NuiEditor } from '@numior/kit/editor';
import { fromHTML, toJSON } from '@numior/kit/editor-core';
import { brief } from '#demo/description';

const document = ref(toJSON(fromHTML(contentSchema, brief)));
</script>
