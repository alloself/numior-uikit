<template>
  <ul class="m-0 text-sm">
    <li>Узкий экран (до 48rem): {{ narrow ? 'да' : 'нет' }}</li>
    <li>Системная тёмная схема: {{ dark ? 'да' : 'нет' }}</li>
    <li>Уменьшенное движение: {{ reduced ? 'да' : 'нет' }}</li>
  </ul>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@numior/primitives';

const narrow = useMediaQuery('(max-width: 48rem)');
const dark = useMediaQuery('(prefers-color-scheme: dark)');
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
</script>
