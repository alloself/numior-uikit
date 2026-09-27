<template>
  <NuiCheckboxGroup
    v-model="channels"
    :options="options"
    label="Каналы уведомлений"
    :description="`Выбрано: ${channels.length}`"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckboxGroup, type NuiOption } from '@numior/vue';

const channels = ref(['email']);

const options: NuiOption<string>[] = [
  { value: 'email', label: 'Почта' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push', disabled: true },
];
</script>
