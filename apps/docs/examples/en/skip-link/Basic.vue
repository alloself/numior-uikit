<template>
  <div class="flex flex-col gap-4">
    <NuiSkipLink target="skip-demo-content" />
    <nav class="flex gap-4 text-sm" aria-label="Example navigation">
      <NuiLink href="#">Catalog</NuiLink>
      <NuiLink href="#">Orders</NuiLink>
      <NuiLink href="#">Settings</NuiLink>
    </nav>
    <section id="skip-demo-content" class="border rounded-md p-4 text-sm">
      Press Tab inside the example: the "Skip to content" link appears above the navigation and
      moves the focus here.
    </section>
  </div>
</template>

<script setup lang="ts">
import { NuiLink, NuiSkipLink } from '@numior/vue';
</script>
