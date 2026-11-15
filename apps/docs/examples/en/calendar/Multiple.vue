<template>
  <div class="flex flex-col gap-3">
    <NuiCalendar v-model="days" mode="multiple" today="2026-09-27" />
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiCalendar, type NuiCalendarValue } from '@numior/vue';

const plural = new Intl.PluralRules('en-US');

const dayWords: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'day',
  few: 'days',
  many: 'days',
};

const days = ref<NuiCalendarValue>(['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24']);

const summary = computed(() => {
  const count = Array.isArray(days.value) ? days.value.length : 0;

  return `The pickup point is open ${count} ${dayWords[plural.select(count)] ?? 'days'}.`;
});
</script>
