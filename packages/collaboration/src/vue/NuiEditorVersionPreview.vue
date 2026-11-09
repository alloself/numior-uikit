<template>
  <div class="nui-collab-history__preview">
    <NuiSwitch
      size="sm"
      :model-value="history.comparing.value"
      :label="text.showChanges"
      @update:model-value="history.compare"
    />
    <NuiSkeleton v-if="history.loading.value" :lines="3" />
    <template v-else-if="history.preview.value !== undefined">
      <p v-if="history.changes.value === 0" class="nui-collab-history__note">
        {{ text.noChanges }}
      </p>
      <NuiContent :document="history.preview.value" size="sm" />
      <div class="nui-collab-history__actions">
        <NuiButton size="sm" @click="history.restore">{{ text.restore }}</NuiButton>
        <NuiButton size="sm" variant="ghost" tone="neutral" @click="history.close">{{
          text.closeVersion
        }}</NuiButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { NuiContent } from '@numior/content';
import { NuiButton, NuiSkeleton, NuiSwitch } from '@numior/vue';
import type { NuiEditorVersionPreviewProps } from './collab.types';

const { history, text } = defineProps<NuiEditorVersionPreviewProps>();
</script>
