<template>
  <NuiSplitter id="panes" :ratio="0.4">
    <template #start>
      <p>Preview</p>
    </template>
    <template #end>
      <p>Code</p>
    </template>
  </NuiSplitter>
</template>

<script setup lang="ts">
import { NuiSplitter } from '../../../src';
</script>
