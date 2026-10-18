<template>
  <div :dir="dir">
    <NuiCalendar v-bind="calendar" v-model="model" v-model:month="month">
      <template v-if="actions !== undefined" #actions>{{ actions }}</template>
    </NuiCalendar>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { NuiCalendar, type NuiCalendarProps, type NuiCalendarValue } from '../../src';

const { calendar, dir, actions } = defineProps<{
  calendar: NuiCalendarProps;
  dir?: 'ltr' | 'rtl' | undefined;
  actions?: string | undefined;
}>();

const model = defineModel<NuiCalendarValue>({ required: true });

const month = defineModel<string | undefined>('month');

defineExpose({ model, month });
</script>
