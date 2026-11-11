<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 208 208"
    fill="currentColor"
    fill-rule="evenodd"
    aria-hidden="true"
    class="size-5 shrink-0"
  >
    <path :d="MARK_BLOCK" />
    <path :d="MARK_MODULE" />
  </svg>
</template>

<script setup lang="ts">
import { MARK_BLOCK, MARK_MODULE } from '../brand';
</script>
