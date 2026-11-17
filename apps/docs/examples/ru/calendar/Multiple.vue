<template>
  <div class="flex flex-col gap-3">
    <NuiCalendar v-model="days" mode="multiple" today="2026-09-27" />
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiCalendar, type NuiCalendarValue } from '@numior/kit';

const plural = new Intl.PluralRules('ru-RU');

const dayWords: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'день',
  few: 'дня',
  many: 'дней',
};

const days = ref<NuiCalendarValue>(['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24']);

const summary = computed(() => {
  const count = Array.isArray(days.value) ? days.value.length : 0;

  return `Пункт выдачи открыт ${count} ${dayWords[plural.select(count)] ?? 'дня'}.`;
});
</script>
