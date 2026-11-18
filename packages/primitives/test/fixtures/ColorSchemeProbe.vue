<template>
  <section :class="`nui-theme--${scheme}`">{{ resolved }}</section>
</template>

<script setup lang="ts">
import { useColorScheme } from '../../src';

const { scheme, resolved } = useColorScheme();
</script>
