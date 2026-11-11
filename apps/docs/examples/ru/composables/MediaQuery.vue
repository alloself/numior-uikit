<template>
  <ul class="m-0 text-sm">
    <li>{{ narrow ? 'Экран не шире 48rem.' : 'Экран шире 48rem.' }}</li>
    <li>{{ dark ? 'В системе выбрана тёмная тема.' : 'В системе выбрана светлая тема.' }}</li>
    <li>{{ reduced ? 'Анимации в системе уменьшены.' : 'Анимации в системе включены.' }}</li>
  </ul>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@numior/primitives';

const narrow = useMediaQuery('(max-width: 48rem)');
const dark = useMediaQuery('(prefers-color-scheme: dark)');
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
</script>
