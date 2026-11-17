<template>
  <div v-bind="rest" :class="[base, { 'nui-content__toggle--open': open }]">
    <component :is="parts.lead" v-if="parts.lead" :aria-expanded="String(open)" @click="flip">
      <span class="nui-content__toggle-mark"><NuiIcon icon="chevron-right" /></span>
    </component>
    <NuiContentParts :parts="parts.rest" />
  </div>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import { computed, ref, watch } from 'vue';
import { splitLead, type ContentPart } from './content-parts';
import { ContentAttrValue } from './content.types';
import NuiContentParts from './NuiContentParts.vue';

const OPEN = 'nui-content__toggle--open';

const {
  open: initial,
  attributes,
  content,
} = defineProps<{
  open: boolean;
  attributes: Readonly<Record<string, string>>;
  content: readonly ContentPart[];
}>();

const open = ref(initial);
const parts = computed(() => splitLead(content));

const base = computed(() =>
  (attributes.class ?? '')
    .split(' ')
    .filter((token) => token !== OPEN)
    .join(' '),
);

const rest = computed(() =>
  Object.fromEntries(
    Object.entries(attributes).filter(([name]) => name !== ContentAttrValue.Class),
  ),
);

const flip = (): void => {
  open.value = !open.value;
};

watch(
  () => initial,
  (value) => {
    open.value = value;
  },
);
</script>
