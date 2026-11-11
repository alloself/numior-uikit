<template>
  <Suspense>
    <IconsView :texts="texts" />
  </Suspense>
</template>

<script setup lang="ts">
import { useDocs } from '../composables/use-docs';
import IconsView from './IconsView.vue';

const { texts } = useDocs();
</script>
