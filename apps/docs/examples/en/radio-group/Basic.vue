<template>
  <NuiRadioGroup v-model="plan" label="Plan" description="You can change it later">
    <NuiRadio value="free">Free</NuiRadio>
    <NuiRadio value="team">Team</NuiRadio>
    <NuiRadio value="business" disabled>Business</NuiRadio>
  </NuiRadioGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/vue';

const plan = ref('team');
</script>
