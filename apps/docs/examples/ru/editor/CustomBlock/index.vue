<template>
  <div class="w-full">
    <NuiEditor
      v-model="document"
      toolbar="both"
      :schema="schema"
      :blocks="blocks"
      aria-label="Подборка для гостиной"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Package } from '@lucide/vue';
import { extendContentSchema } from '@numior/content';
import { insertLeaf, renderTag, type AttrValue } from '@numior/editor-core';
import { defineBlock, editorBlocks, NuiEditor } from '@numior/editor-vue';
import { products } from '#demo/products';
import ProductBlock from './ProductBlock.vue';

const CARD = 'shop-product';

const nameOf = (sku: AttrValue | undefined) =>
  products.find((product) => product.sku === sku)?.name ?? '';

const schema = extendContentSchema({
  product: {
    group: 'block',
    attrs: { sku: { default: 'S-101', verify: (sku) => nameOf(sku) !== '' } },
    render: (node) =>
      renderTag('div', { class: `${CARD} ${CARD}--${String(node.attrs.sku)}` }, [
        nameOf(node.attrs.sku),
      ]),
    parse: [
      {
        tag: 'div',
        priority: 1,
        attrs: (element) =>
          element.hasClass(CARD) ? { sku: element.classWith(`${CARD}--`) ?? null } : false,
      },
    ],
  },
});

const productBlock = defineBlock({
  name: 'product',
  view: ProductBlock,
  slash: () => [
    {
      key: 'product',
      label: 'Товар',
      icon: Package,
      keywords: ['product', 'товар', 'артикул'],
      kind: 'command',
      command: insertLeaf('product'),
    },
  ],
});

const blocks = [...editorBlocks, productBlock];

const document = ref(`
<h2>Подборка для гостиной</h2>
<p>Кресло и торшер из одной коллекции: светлый дуб и серый лён.</p>
<div class="shop-product shop-product--S-101">Кресло «Осло»</div>
<div class="shop-product shop-product--L-408">Торшер «Арка»</div>
`);
</script>
