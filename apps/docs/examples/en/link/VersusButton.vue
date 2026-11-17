<template>
  <div class="flex flex-col gap-4 w-full max-w-sm text-sm">
    <p>
      Check the delivery address and the
      <NuiLink href="#address">return terms for bulky goods</NuiLink>
      before paying.
    </p>
    <div class="flex items-center gap-2">
      <NuiButton>Pay</NuiButton>
      <NuiButton variant="link">Change address</NuiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiLink } from '@numior/kit';
</script>
