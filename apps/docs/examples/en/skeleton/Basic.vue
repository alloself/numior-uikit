<template>
  <div class="flex flex-col gap-4 w-full max-w-sm" aria-busy="true">
    <div class="flex items-center gap-3">
      <NuiSkeleton shape="circle" />
      <NuiSkeleton :lines="2" class="w-full" />
    </div>
    <NuiSkeleton shape="rect" height="6rem" />
    <NuiSkeleton width="40%" />
  </div>
</template>

<script setup lang="ts">
import { NuiSkeleton } from '@numior/vue';
</script>
