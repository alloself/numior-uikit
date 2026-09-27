<template>
  <div class="nui-flex nui-flex-col nui-gap-4">
    <NuiSkipLink target="skip-demo-content" />
    <nav class="nui-flex nui-gap-4 nui-text-sm" aria-label="Example navigation">
      <NuiLink href="#">Catalog</NuiLink>
      <NuiLink href="#">Orders</NuiLink>
      <NuiLink href="#">Settings</NuiLink>
    </nav>
    <section id="skip-demo-content" class="nui-border nui-rounded nui-p-4 nui-text-sm">
      Press Tab inside the example: the "Skip to content" link appears above the navigation and
      moves the focus here.
    </section>
  </div>
</template>

<script setup lang="ts">
import { NuiLink, NuiSkipLink } from '@numior/vue';
</script>
