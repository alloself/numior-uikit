<template>
  <div class="nui-sidebar__footer"><slot /></div>
</template>

<script setup lang="ts">
defineSlots<{ default(): unknown }>();
</script>
