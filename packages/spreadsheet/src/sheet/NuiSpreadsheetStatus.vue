<template>
  <div
    ref="root"
    class="nui-spreadsheet__status"
    :class="{ 'nui-spreadsheet__status--shown': shown }"
    :inert="!shown"
  >
    <span class="nui-spreadsheet__status-text">{{ text }}</span>
    <span class="nui-spreadsheet__status-progress">
      <NuiProgress size="sm" :value="percent" :max="100" :label="text" />
    </span>
    <NuiButton size="xs" variant="ghost" tone="neutral" @click="onAction">
      {{ running ? messages.stopRecalc : messages.resumeRecalc }}
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { useLocale } from '@numior/primitives';
import { NuiButton, NuiProgress } from '@numior/vue';
import { computed, useTemplateRef, watch } from 'vue';
import { RecalcPhase, type SheetStatusProps } from './sheet.types';

const { phase, progress, messages } = defineProps<SheetStatusProps>();

const emit = defineEmits<{
  stop: [];
  resume: [];
  leave: [];
}>();

const root = useTemplateRef<HTMLElement>('root');

const locale = useLocale(() => undefined);

const shares = computed(
  () => new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 0 }),
);

const shown = computed(() => phase !== RecalcPhase.Idle);

const running = computed(() => phase === RecalcPhase.Running);

const percent = computed(() => Math.round(progress * 100));

const text = computed(() =>
  running.value
    ? messages.recalculating({ share: shares.value.format(progress) })
    : messages.recalcStopped,
);

const onAction = (): void => {
  if (running.value) {
    emit('stop');
  } else {
    emit('resume');
  }
};

watch(shown, (now) => {
  if (!now && root.value?.contains(document.activeElement) === true) {
    emit('leave');
  }
});
</script>
