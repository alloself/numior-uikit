<template>
  <div class="nui-flex nui-flex-col nui-gap-4 nui-w-full nui-max-w-sm" aria-busy="true">
    <div class="nui-flex nui-items-center nui-gap-3">
      <NuiSkeleton shape="circle" />
      <NuiSkeleton :lines="2" class="nui-w-full" />
    </div>
    <NuiSkeleton shape="rect" height="6rem" />
    <NuiSkeleton width="40%" />
  </div>
</template>

<script setup lang="ts">
import { NuiSkeleton } from '@numior/vue';
</script>
