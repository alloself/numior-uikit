<template>
  <p
    class="m-0 text-xs text-muted-foreground font-(--nui-caption-weight) tracking-(--nui-caption-tracking) [text-transform:var(--nui-caption-transform)] before:[content:var(--nui-caption-open)/''] after:[content:var(--nui-caption-close)/'']"
  >
    <slot />
  </p>
</template>

<script setup lang="ts">
defineSlots<{ default(): unknown }>();
</script>
