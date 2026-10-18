<template>
  <div v-bind="split.rootAttrs()">
    <input v-bind="split.controlAttrs()" />
  </div>
</template>

<script setup lang="ts">
import { useSplitAttrs } from '../../src';

defineOptions({ inheritAttrs: false });

const split = useSplitAttrs();
</script>
