<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Описание товара</NuiCardTitle>
      <NuiCardDescription>Наберите «/» на пустой строке, чтобы вставить блок</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiEditor
        v-model="document"
        format="json"
        aria-label="Описание товара"
        placeholder="Расскажите о товаре"
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
