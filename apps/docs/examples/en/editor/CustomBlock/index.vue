<template>
  <div class="w-full">
    <NuiEditor
      v-model="document"
      toolbar="both"
      :schema="schema"
      :blocks="blocks"
      aria-label="Living room picks"
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
      label: 'Product',
      icon: Package,
      keywords: ['product', 'item', 'sku'],
      kind: 'command',
      command: insertLeaf('product'),
    },
  ],
});

const blocks = [...editorBlocks, productBlock];

const document = ref(`
<h2>Living room picks</h2>
<p>An armchair and a floor lamp from one collection: light oak and gray linen.</p>
<div class="shop-product shop-product--S-101">Oslo armchair</div>
<div class="shop-product shop-product--L-408">Arc floor lamp</div>
`);
</script>
