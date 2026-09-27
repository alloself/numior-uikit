<template>
  <ul class="nui-m-0 nui-text-sm">
    <li>Narrow screen (up to 48rem): {{ narrow ? 'yes' : 'no' }}</li>
    <li>System dark scheme: {{ dark ? 'yes' : 'no' }}</li>
    <li>Reduced motion: {{ reduced ? 'yes' : 'no' }}</li>
  </ul>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@numior/primitives';

const narrow = useMediaQuery('(max-width: 48rem)');
const dark = useMediaQuery('(prefers-color-scheme: dark)');
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
</script>
