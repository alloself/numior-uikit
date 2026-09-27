<template>
  <ul>
    <li v-for="row in rows" :key="row.id">{{ row.name }}</li>
  </ul>
</template>

<script setup lang="ts">
import { rows } from './data';
</script>
