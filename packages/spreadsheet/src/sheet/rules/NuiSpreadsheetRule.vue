<template>
  <li
    class="nui-spreadsheet-rules__rule"
    :class="{ 'nui-spreadsheet-rules__rule--dragging': dragging }"
    @pointerenter="emit('hover')"
    @pointerleave="emit('leave')"
    @focusin="emit('hover')"
    @focusout="emit('leave')"
  >
    <button
      v-if="!readonly"
      type="button"
      class="nui-spreadsheet-rules__grip"
      :disabled="gripDisabled"
      :aria-label="texts.moveRule({ rule: row.description })"
      @pointerdown="emit('grab', $event)"
      @keydown="emit('gripKeydown', $event)"
      @blur="emit('gripBlur')"
    >
      <NuiIcon icon="grip" />
    </button>
    <span
      class="nui-spreadsheet-rules__preview"
      :class="`nui-spreadsheet-rules__preview--kind-${row.preview.kind}`"
      :style="row.preview.style"
      aria-hidden="true"
    >
      <span
        v-for="(icon, at) in row.preview.icons"
        :key="at"
        class="nui-spreadsheet-rules__glyph"
        :style="{ color: icon.color }"
      >
        <NuiIcon :icon="icon.icon" :filled="icon.filled" />
      </span>
      <span v-if="row.preview.kind === RulePreviewKind.Style">{{ texts.sample }}</span>
    </span>
    <span class="nui-spreadsheet-rules__text">
      <span class="nui-spreadsheet-rules__description">{{ row.description }}</span>
      <span class="nui-spreadsheet-rules__area">{{ row.area }}</span>
    </span>
    <span v-if="!readonly" class="nui-spreadsheet-rules__actions">
      <NuiButton
        v-for="action in editActions"
        :key="action"
        variant="ghost"
        tone="neutral"
        size="xs"
        icon-only
        :aria-label="texts.editRule({ rule: row.description })"
        @click="emit('edit')"
      >
        <NuiIcon :icon="PENCIL" />
      </NuiButton>
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="xs"
        icon-only
        :aria-label="texts.deleteRule({ rule: row.description })"
        @click="emit('remove')"
      >
        <NuiIcon icon="trash" />
      </NuiButton>
    </span>
  </li>
</template>

<script setup lang="ts">
import { Pencil } from '@lucide/vue';
import { NuiButton, NuiIcon } from '@numior/vue';
import { computed, markRaw } from 'vue';
import { RulePreviewKind, type SheetRuleProps } from './rules.types';

const PENCIL = markRaw(Pencil);

const { row, readonly, dragging, gripDisabled, texts } = defineProps<SheetRuleProps>();

const emit = defineEmits<{
  grab: [event: PointerEvent];
  gripKeydown: [event: KeyboardEvent];
  gripBlur: [];
  remove: [];
  hover: [];
  leave: [];
  edit: [];
}>();

const editActions = computed((): string[] => (row.editable ? ['edit'] : []));
</script>
