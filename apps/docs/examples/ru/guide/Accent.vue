<template>
  <div class="flex flex-wrap gap-3">
    <span v-for="accent in accents" :key="accent" :data-nui-accent="accent">
      <NuiButton>{{ accent }}</NuiButton>
    </span>
  </div>
</template>

<script setup lang="ts">
import { NuiButton } from '@numior/vue';

const accents = ['indigo', 'blue', 'violet', 'emerald', 'teal', 'rose', 'orange', 'amber', 'slate'];
</script>
