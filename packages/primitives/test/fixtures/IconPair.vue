<template>
  <component :is="icon" />
  <component :is="icon" />
</template>

<script setup lang="ts">
import type { Component } from 'vue';

const { icon } = defineProps<{
  icon: Component;
}>();
</script>
