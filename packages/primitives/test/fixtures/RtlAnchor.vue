<template>
  <div dir="rtl">
    <i ref="anchor" />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useDirection } from '../../src';

const anchor = useTemplateRef<HTMLElement>('anchor');
const direction = useDirection(anchor);

defineExpose({ direction });
</script>
