<template>
  <NuiSkipLink target="main" v-bind="props" />
  <main v-if="withTarget" id="main">Content</main>
</template>

<script setup lang="ts">
import { NuiSkipLink, type NuiSkipLinkProps } from '../../src';

const { props = {}, withTarget = true } = defineProps<{
  props?: Partial<NuiSkipLinkProps> | undefined;
  withTarget?: boolean | undefined;
}>();
</script>
