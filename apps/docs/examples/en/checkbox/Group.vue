<template>
  <NuiCheckboxGroup
    v-model:values="channels"
    :options="options"
    label="Notification channels"
    :description="`Selected: ${channels.length}`"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckboxGroup, type NuiOption } from '@numior/vue';

const channels = ref(['email']);

const options: NuiOption<string>[] = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push', disabled: true },
];
</script>
