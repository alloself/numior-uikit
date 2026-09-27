<template>
  <NuiSwitch v-model="notifications" description="Письмо раз в день, в 9:00">
    Уведомления о задачах
  </NuiSwitch>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSwitch } from '@numior/vue';

const notifications = ref(true);
</script>
