<template>
  <div class="nui-sidebar__header"><slot /></div>
</template>

<script setup lang="ts">
defineSlots<{ default(): unknown }>();
</script>
