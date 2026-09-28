<template>
  <div class="flex flex-col gap-3">
    <NuiCalendar v-model="dates" mode="multiple" size="sm" today="2026-09-27" />
    <p class="text-sm text-muted-foreground">
      Дежурства: {{ Array.isArray(dates) ? dates.length : 0 }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCalendar, type NuiCalendarValue } from '@numior/vue';

const dates = ref<NuiCalendarValue>(['2026-09-03', '2026-09-10', '2026-09-17']);
</script>
