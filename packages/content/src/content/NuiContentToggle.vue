<template>
  <div v-bind="rest" :class="[base, { 'nui-content__toggle--open': open }]">
    <template v-for="(part, index) in content" :key="index">
      <component
        :is="part"
        v-if="index === 0 && isVNode(part)"
        :aria-expanded="String(open)"
        @click="flip"
      />
      <component :is="part" v-else-if="isVNode(part)" />
      <template v-else>{{ part }}</template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, isVNode, ref, watch, type VNode } from 'vue';
import { ContentAttrValue } from './content.types';

const OPEN = 'nui-content__toggle--open';

const {
  open: initial,
  attributes,
  content,
} = defineProps<{
  open: boolean;
  attributes: Readonly<Record<string, string>>;
  content: readonly (VNode | string)[];
}>();

const open = ref(initial);

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
