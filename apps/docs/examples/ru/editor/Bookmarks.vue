<template>
  <div class="w-full">
    <NuiEditor
      v-model="document"
      format="json"
      :link-metadata="linkMetadata"
      label="С этим товаром берут"
      description="Вставьте ссылку на товар в пустую строку и выберите «Закладка»"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { contentSchema } from '@numior/kit/content';
import type { DocJSON } from '@numior/kit/editor-core';
import { NuiEditor, type NuiEditorLinkMetadata } from '@numior/kit/editor';
import { products } from '#demo/products';

const SHOP = 'https://shop.example/products/';

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const cardOf = (url: string) => {
  const product = products.find((item) => url === `${SHOP}${item.sku}`);

  return product === undefined
    ? {}
    : {
        title: product.name,
        description: `${money.format(product.price)}, в наличии ${String(product.stock)} шт.`,
        site: 'shop.example',
      };
};

const linkMetadata: NuiEditorLinkMetadata = (url) => Promise.resolve(cardOf(url));

const document = shallowRef<DocJSON>({
  format: 1,
  schema: { name: contentSchema.name, version: contentSchema.version },
  root: {
    id: 'doc',
    type: 'doc',
    content: [
      { id: 'lead', type: 'paragraph', content: [{ text: 'К креслу «Осло» часто берут:' }] },
      { id: 'throw', type: 'bookmark', attrs: { url: `${SHOP}X-501`, ...cardOf(`${SHOP}X-501`) } },
      { id: 'pillow', type: 'bookmark', attrs: { url: `${SHOP}X-507`, ...cardOf(`${SHOP}X-507`) } },
      { id: 'more', type: 'paragraph' },
    ],
  },
});
</script>
