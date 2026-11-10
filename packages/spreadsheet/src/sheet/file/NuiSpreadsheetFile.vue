<template>
  <div v-if="bar" class="nui-spreadsheet__file">
    <p class="nui-spreadsheet__file-name" :title="file.name.value">
      <span class="nui-spreadsheet__file-text">{{ file.name.value }}</span>
      <span v-if="file.edited.value" class="nui-spreadsheet__file-edited">
        {{ messages.fileEdited }}
      </span>
    </p>
    <span v-if="reading" class="nui-spreadsheet__file-progress">
      <NuiProgress size="sm" :value="percent" :max="100" :label="messages.fileReading" />
      <NuiButton size="xs" variant="ghost" tone="neutral" @click="file.cancel">
        {{ messages.fileCancel }}
      </NuiButton>
    </span>
    <span class="nui-spreadsheet__file-actions">
      <NuiButton size="sm" variant="ghost" tone="neutral" :disabled="busy" @click="pick">
        <NuiIcon :icon="OPEN_ICON" />
        {{ messages.fileOpen }}
      </NuiButton>
      <NuiButton
        size="sm"
        variant="ghost"
        tone="neutral"
        :disabled="reading"
        :loading="saving"
        @click="file.save"
      >
        <NuiIcon :icon="SAVE_ICON" />
        {{ messages.fileSave }}
      </NuiButton>
    </span>
    <input
      ref="input"
      class="nui-spreadsheet__file-input"
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      @change="onChosen"
    />
  </div>
  <NuiAlert
    v-if="file.failure.value !== undefined"
    tone="error"
    :title="file.failure.value"
    closable
    :close-label="messages.reportDismiss"
    @update:open="file.clearFailure"
  />
  <NuiDialog
    :open="file.asking.value"
    :title="dialog.title"
    :description="dialog.description"
    size="sm"
    :close-label="messages.fileCancel"
    @update:open="onDialog"
  >
    <template v-if="dialog.lines.length > 0" #default>
      <ul class="nui-spreadsheet__file-losses">
        <li v-for="line in dialog.lines" :key="line">{{ line }}</li>
      </ul>
    </template>
    <template #footer>
      <NuiButton variant="outline" tone="neutral" @click="file.dismiss">
        {{ messages.fileCancel }}
      </NuiButton>
      <NuiButton tone="error" @click="file.confirm">{{ dialog.confirm }}</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { FolderOpen, Save } from '@lucide/vue';
import { NuiAlert, NuiButton, NuiDialog, NuiIcon, NuiProgress } from '@numior/vue';
import { computed, markRaw, useTemplateRef } from 'vue';
import type { NuiSpreadsheetMessages } from '../spreadsheet.messages';
import {
  FileAskKind,
  FileBusy,
  type FileAsk,
  type SheetFileViewExposed,
  type SheetFileViewProps,
} from './file.types';

interface FileDialog {
  readonly title: string;
  readonly description: string;
  readonly confirm: string;
  readonly lines: readonly string[];
}

const OPEN_ICON = markRaw(FolderOpen);

const SAVE_ICON = markRaw(Save);

const dialogOf = (ask: FileAsk | undefined, texts: NuiSpreadsheetMessages): FileDialog => {
  if (ask?.kind === FileAskKind.Losses) {
    return {
      title: texts.fileLossTitle,
      description: texts.fileLossDescription,
      confirm: texts.fileLossConfirm,
      lines: ask.losses.map((loss) => texts.fileLoss(loss)),
    };
  }
  return {
    title: texts.fileDiscardTitle,
    description: texts.fileDiscardDescription,
    confirm: texts.fileDiscardConfirm,
    lines: [],
  };
};

const { file, messages } = defineProps<SheetFileViewProps>();

const input = useTemplateRef<HTMLInputElement>('input');

const reading = computed(() => file.busy.value === FileBusy.Reading);

const saving = computed(() => file.busy.value === FileBusy.Saving);

const busy = computed(() => file.busy.value !== FileBusy.Idle);

const percent = computed(() => Math.round(file.progress.value * 100));

const dialog = computed(() => dialogOf(file.ask.value, messages));

const pick = (): void => {
  input.value?.click();
};

const onChosen = (): void => {
  const chosen = input.value?.files?.[0];

  if (chosen !== undefined) {
    void file.open(chosen);
  }
  if (input.value !== null) {
    input.value.value = '';
  }
};

const onDialog = (open: boolean): void => {
  if (!open) {
    file.dismiss();
  }
};

defineExpose<SheetFileViewExposed>({ pick });
</script>
