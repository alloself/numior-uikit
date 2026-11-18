<template>
  <NuiStepper readonly class="w-full max-w-xl">
    <NuiStepperStep title="Add your products">
      <p>A name, a price and one photo are enough; fill in the rest later.</p>
    </NuiStepperStep>
    <NuiStepperStep title="Set up shipping">
      <p>Pick the cities and set a price for each zone.</p>
    </NuiStepperStep>
    <NuiStepperStep title="Open the storefront">
      <p>Shoppers see the catalog as soon as you publish it.</p>
      <NuiButton class="mt-3">Publish</NuiButton>
    </NuiStepperStep>
  </NuiStepper>
</template>

<script setup lang="ts">
import { NuiButton, NuiStepper, NuiStepperStep } from '@numior/kit';
</script>
