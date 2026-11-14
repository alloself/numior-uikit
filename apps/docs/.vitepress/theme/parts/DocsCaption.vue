<template>
  <p
    class="m-0 text-xs text-muted-foreground font-(--font-weight-caption) tracking-(--tracking-caption) [text-transform:var(--caption-transform)] before:[content:var(--caption-open)/''] after:[content:var(--caption-close)/'']"
  >
    <slot />
  </p>
</template>

<script setup lang="ts">
defineSlots<{ default(): unknown }>();
</script>
