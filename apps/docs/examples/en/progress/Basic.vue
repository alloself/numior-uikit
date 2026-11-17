<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <div class="flex justify-between text-sm">
        <span>Picking order 20410</span>
        <span class="text-muted-foreground">5 of 7 items</span>
      </div>
      <NuiProgress :value="5" :max="7" label="Picking order 20410" value-text="5 of 7 items" />
    </div>
    <div class="flex flex-col gap-2">
      <span class="text-sm">Waiting for the bank on order 20411</span>
      <NuiProgress label="Waiting for the bank on order 20411" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuiProgress } from '@numior/kit';
</script>
