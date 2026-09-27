<template>
  <NuiRadioGroup v-model="delivery" label="Delivery" orientation="horizontal" size="sm">
    <NuiRadio value="courier">Courier</NuiRadio>
    <NuiRadio value="pickup">Pickup</NuiRadio>
    <NuiRadio value="post">Post</NuiRadio>
  </NuiRadioGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/vue';

const delivery = ref('courier');
</script>
