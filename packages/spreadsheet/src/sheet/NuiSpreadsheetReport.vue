<template>
  <NuiAlert
    v-if="report !== undefined && worthShowing"
    v-model:open="open"
    :tone="report.readOnly ? 'warning' : 'info'"
    :title="title"
    dismissible
    :dismiss-label="messages.reportDismiss"
  >
    <p v-if="staleShown && title !== staleText" class="nui-spreadsheet__report-stale">
      {{ staleText }}
    </p>
    <NuiCollapsible v-if="lines.length > 0" :label="messages.reportDetails">
      <ul class="nui-spreadsheet__report-list">
        <li v-for="line in lines" :key="line.key">{{ line.text }}</li>
      </ul>
    </NuiCollapsible>
    <template v-if="staleShown && !report.readOnly" #actions>
      <NuiButton size="sm" variant="outline" tone="neutral" @click="emit('recalculate')">
        {{ messages.reportRecalc }}
      </NuiButton>
    </template>
  </NuiAlert>
</template>

<script setup lang="ts">
import { NuiAlert, NuiButton, NuiCollapsible } from '@numior/vue';
import { computed, ref, watch } from 'vue';
import type { XlsxLimitation } from '../xlsx/read/read.types';
import type { NuiSpreadsheetMessages } from './spreadsheet.messages';
import type { ReportLine, SheetReportProps } from './sheet.types';

const { report, messages, recalculated } = defineProps<SheetReportProps>();

const emit = defineEmits<{
  recalculate: [];
}>();

const open = ref(true);

const detailOf = (item: XlsxLimitation): string =>
  [
    item.count > 1 ? String(item.count) : '',
    item.names.join(', '),
    item.sheets.length > 0 ? `(${item.sheets.join(', ')})` : '',
  ]
    .filter((part) => part !== '')
    .join(' ');

const lineOf = (item: XlsxLimitation, texts: NuiSpreadsheetMessages): ReportLine => {
  const detail = detailOf(item);
  const text = texts.limitation({ code: item.code });

  return { key: item.code, text: detail === '' ? text : `${text}: ${detail}` };
};

const lines = computed((): ReportLine[] =>
  (report?.items ?? []).map((item) => lineOf(item, messages)),
);

const staleShown = computed(() => !recalculated && (report?.staleFormulas ?? 0) > 0);

const staleText = computed(() => messages.reportStale({ count: report?.staleFormulas ?? 0 }));

const title = computed(() => {
  if (report?.readOnly === true) {
    return messages.reportReadOnly;
  }
  return lines.value.length > 0 ? messages.reportPartial : staleText.value;
});

const worthShowing = computed(
  () => report?.readOnly === true || staleShown.value || lines.value.length > 0,
);

watch(
  () => report,
  () => {
    open.value = true;
  },
);
</script>
