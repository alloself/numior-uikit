<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 208 208"
    fill="currentColor"
    fill-rule="evenodd"
    aria-hidden="true"
    class="size-5 shrink-0 sm:hidden"
  >
    <path :d="MARK_BLOCK" />
    <path :d="MARK_MODULE" />
  </svg>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="LOCKUP_VIEW_BOX"
    fill="currentColor"
    fill-rule="evenodd"
    aria-hidden="true"
    class="hidden h-4 w-auto shrink-0 sm:block"
  >
    <path v-for="contour in LOCKUP_PATHS" :key="contour" :d="contour" />
  </svg>
</template>

<script setup lang="ts">
import { LOCKUP_PATHS, LOCKUP_VIEW_BOX, MARK_BLOCK, MARK_MODULE } from '../brand';
</script>
