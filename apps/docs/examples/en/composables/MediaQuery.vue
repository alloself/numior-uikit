<template>
  <ul class="m-0 text-sm">
    <li>{{ narrow ? 'The screen is 48rem wide or less.' : 'The screen is wider than 48rem.' }}</li>
    <li>{{ dark ? 'The system uses the dark theme.' : 'The system uses the light theme.' }}</li>
    <li>{{ reduced ? 'The system reduces motion.' : 'The system keeps motion on.' }}</li>
  </ul>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@numior/primitives';

const narrow = useMediaQuery('(max-width: 48rem)');
const dark = useMediaQuery('(prefers-color-scheme: dark)');
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
</script>
