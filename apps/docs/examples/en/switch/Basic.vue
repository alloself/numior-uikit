<template>
  <NuiSwitch v-model="notifications" description="One email a day, at 9:00">
    Task notifications
  </NuiSwitch>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSwitch } from '@numior/vue';

const notifications = ref(true);
</script>
