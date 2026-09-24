<template>
  <tr v-if="size > 0" class="nui-table__spacer" aria-hidden="true">
    <td :colspan="span" :style="{ blockSize: `${size}px` }"></td>
  </tr>
</template>

<script setup lang="ts">
const { span, size } = defineProps<{ span: number; size: number }>();
</script>
