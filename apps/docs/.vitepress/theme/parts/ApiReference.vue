<template>
  <Suspense>
    <ApiReferenceView :names="resolvedNames" :locale="locale" :texts="texts" />
  </Suspense>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { useDocs } from '../composables/use-docs';
import { exampleLocaleOf } from '../examples';
import type { ApiReferenceProps } from '../theme.types';
import ApiReferenceView from './ApiReferenceView.vue';

const { name, names } = defineProps<ApiReferenceProps>();

const { localeIndex } = useData();
const { texts } = useDocs();

const locale = computed(() => exampleLocaleOf(localeIndex.value));
const resolvedNames = computed(() => names ?? (name === undefined ? [] : [name]));
</script>
