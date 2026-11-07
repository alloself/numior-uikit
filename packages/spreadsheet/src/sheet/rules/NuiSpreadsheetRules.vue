<template>
  <div
    ref="panel"
    class="nui-spreadsheet-rules"
    :class="{ 'nui-spreadsheet-rules--reordering': reordering }"
    @keydown="onKeydown"
  >
    <div class="nui-spreadsheet-rules__header">
      <h2 :id="titleId" class="nui-spreadsheet-rules__title">{{ texts.title }}</h2>
      <NuiButton
        ref="closeButton"
        variant="ghost"
        tone="neutral"
        size="xs"
        icon-only
        :aria-label="texts.close"
        @click="emit('close')"
      >
        <NuiIcon icon="x" />
      </NuiButton>
    </div>
    <template v-if="editing === undefined">
      <div class="nui-spreadsheet-rules__tools">
        <NuiSwitch v-model="only" size="sm" :label="texts.onlySelection" />
        <NuiButton
          v-if="!readonly"
          ref="addButton"
          variant="outline"
          tone="neutral"
          size="sm"
          icon="plus"
          @click="startEdit(undefined)"
        >
          {{ texts.addRule }}
        </NuiButton>
      </div>
      <div ref="list" class="nui-spreadsheet-rules__list">
        <ol class="nui-spreadsheet-rules__rules" role="list">
          <NuiSpreadsheetRule
            v-for="(row, at) in shown"
            :key="row.key"
            :row="row"
            :readonly="readonly"
            :dragging="row.key === grabbedKey"
            :grip-disabled="alone"
            :texts="texts"
            @grab="onGrab(at, $event)"
            @grip-keydown="onGripKeydown(at, $event)"
            @remove="remove(at)"
            @edit="startEdit(row.placed)"
            @hover="emit('hover', row.placed.ranges)"
            @leave="emit('hover', undefined)"
          />
        </ol>
        <span class="nui-spreadsheet-rules__drop" aria-hidden="true"></span>
        <span
          v-for="row in ghosts"
          :key="row.key"
          class="nui-spreadsheet-rules__ghost"
          aria-hidden="true"
        >
          <NuiIcon icon="grip" />
          <span>{{ row.description }}</span>
        </span>
      </div>
      <p v-for="text in empty" :key="text" class="nui-spreadsheet-rules__empty">{{ text }}</p>
    </template>
    <NuiSpreadsheetRuleEditor
      v-else
      ref="editor"
      v-model:form="editingForm"
      :title="editorTitle"
      :texts="editorTexts"
      :looks="looks"
      :error="editing.error"
      @save="save"
      @cancel="stopEdit"
    />
    <span class="nui-spreadsheet-rules__live" role="status" aria-live="polite">{{
      announcement
    }}</span>
  </div>
</template>

<script setup lang="ts">
import {
  Key,
  ReorderAxis,
  ReorderEventType,
  ReorderPhase,
  useMessages,
  useReorder,
  type ReorderEvent,
  type ReorderState,
} from '@numior/primitives';
import { NuiButton, NuiIcon, NuiSwitch } from '@numior/vue';
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue';
import {
  moveRule,
  putRule,
  removeRule,
  type CellRange,
  type ConditionalFormat,
  type PlacedRule,
} from '../../core';
import NuiSpreadsheetRule from './NuiSpreadsheetRule.vue';
import NuiSpreadsheetRuleEditor from './NuiSpreadsheetRuleEditor.vue';
import { spreadsheetRuleEditorMessages } from './rule-editor.messages';
import { formOf, ruleOf } from './rule-form';
import { dropLineAt, ruleElements, ruleIndexAt } from './rule-geometry';
import { spreadsheetRulesMessages } from './rules.messages';
import type { RuleEditing, RuleForm, RuleRow, SheetRulesProps } from './rules.types';
import { useRuleRows } from './use-rule-rows';

const { formats, selection, looks, titleId, readonly = false } = defineProps<SheetRulesProps>();

const emit = defineEmits<{
  close: [];
  change: [formats: readonly ConditionalFormat[]];
  hover: [ranges: readonly CellRange[] | undefined];
}>();

const list = useTemplateRef<HTMLElement>('list');
const closeButton = useTemplateRef<{ $el: HTMLElement }>('closeButton');
const panel = useTemplateRef<HTMLElement>('panel');

const addButton = useTemplateRef<{ $el: HTMLElement }>('addButton');
const editor = useTemplateRef<{ focusInvalid(): void }>('editor');

const texts = useMessages(spreadsheetRulesMessages);

const editorTexts = useMessages(spreadsheetRuleEditorMessages);

const editing = shallowRef<RuleEditing>();

const only = ref(false);

const announcement = ref('');

const focusAfter = ref<string>();

const { shown } = useRuleRows({
  formats: () => formats,
  selection: () => selection,
  only: () => only.value,
  looks: () => looks,
  texts,
});

const empty = computed((): string[] => {
  if (shown.value.length > 0) {
    return [];
  }
  return [only.value ? texts.value.noRulesHere : texts.value.noRules];
});

const counted = (event: { readonly to: number }) => ({
  position: event.to + 1,
  count: shown.value.length,
});

const announce = (event: ReorderEvent): void => {
  switch (event.type) {
    case ReorderEventType.Grabbed:
      announcement.value = texts.value.grabbed({
        position: event.from + 1,
        count: shown.value.length,
      });

      break;
    case ReorderEventType.Moved:
    case ReorderEventType.Dropped:
      announcement.value = texts.value.ruleMoved(counted(event));
      break;
    case ReorderEventType.Cancelled:
      announcement.value = texts.value.cancelled;
      break;
  }
};

const place = (state: ReorderState): void => {
  const element = list.value;

  if (element === null) {
    return;
  }

  switch (state.phase) {
    case ReorderPhase.Dragging:
      element.style.setProperty(
        '--_drop',
        `${String(dropLineAt(element, state.from, state.to))}px`,
      );

      element.style.setProperty(
        '--_ghost',
        `${String(state.position - element.getBoundingClientRect().top)}px`,
      );

      break;
    case ReorderPhase.Keyboard:
      element.style.setProperty(
        '--_drop',
        `${String(dropLineAt(element, state.from, state.to))}px`,
      );

      break;
    case ReorderPhase.Idle:
    case ReorderPhase.Pending:
      break;
  }
};

const move = (from: number, to: number): void => {
  const source = shown.value[from];
  const target = shown.value[to];

  if (source === undefined || target === undefined) {
    return;
  }
  focusAfter.value = source.key;
  emit('change', moveRule(formats, source.index, target.index));
};

const reorder = useReorder({
  axis: ReorderAxis.Y,
  count: () => shown.value.length,
  container: () => list.value,
  indexAt: (client, from) => ruleIndexAt(list.value, from, client),
  onMove: move,
  onChange: place,
  onEvent: announce,
});

const reordering = computed(() => {
  const { phase } = reorder.state.value;

  return phase === ReorderPhase.Dragging || phase === ReorderPhase.Keyboard;
});

const grabbedKey = computed(() => {
  const state = reorder.state.value;

  return state.phase === ReorderPhase.Dragging || state.phase === ReorderPhase.Keyboard
    ? shown.value[state.from]?.key
    : undefined;
});

const alone = computed(() => shown.value.length < 2);

const ghosts = computed((): RuleRow[] => {
  const state = reorder.state.value;
  const row = state.phase === ReorderPhase.Dragging ? shown.value[state.from] : undefined;

  return row === undefined ? [] : [row];
});

const onGrab = (at: number, event: PointerEvent): void => {
  if (!readonly) {
    reorder.onPointerdown(at, event);
  }
};

const onGripKeydown = (at: number, event: KeyboardEvent): void => {
  if (!readonly && reorder.onKeydown(at, event)) {
    event.preventDefault();
  }
};

const remove = (at: number): void => {
  const row = shown.value[at];

  if (row === undefined) {
    return;
  }
  focusAfter.value = (shown.value[at + 1] ?? shown.value[at - 1])?.key;
  announcement.value = texts.value.ruleDeleted;
  emit('hover', undefined);
  emit('change', removeRule(formats, row.placed.entry));
};

const ADD_BUTTON = -1;

const backTo = ref<number>();

const editorTitle = computed(() =>
  editing.value?.target === undefined ? editorTexts.value.newRule : editorTexts.value.changeRule,
);

const editingForm = computed({
  get: (): RuleForm => editing.value?.form ?? formOf(undefined, selection, looks.locale),
  set: (form: RuleForm) => {
    const current = editing.value;

    if (current !== undefined) {
      editing.value = { ...current, form };
    }
  },
});

const startEdit = (target: PlacedRule | undefined): void => {
  if (readonly) {
    return;
  }

  backTo.value =
    target === undefined
      ? ADD_BUTTON
      : shown.value.findIndex((row) => row.placed.entry === target.entry);

  emit('hover', undefined);
  editing.value = { target, form: formOf(target, selection, looks.locale), error: undefined };
};

const stopEdit = (): void => {
  editing.value = undefined;
};

const save = (): void => {
  const current = editing.value;

  if (current === undefined) {
    return;
  }

  const result = ruleOf(current.form, looks.locale);

  if (!result.ok) {
    editing.value = { ...current, error: result.field };
    void nextTick(() => editor.value?.focusInvalid());
    return;
  }
  backTo.value = current.target === undefined ? 0 : backTo.value;
  announcement.value = editorTexts.value.saved;
  emit('change', putRule(formats, result.draft, current.target?.entry));
  editing.value = undefined;
};

const popupOpen = (): boolean =>
  (panel.value?.querySelector('[aria-expanded="true"]') ?? null) !== null;

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key !== Key.Escape || event.defaultPrevented || reordering.value || popupOpen()) {
    return;
  }
  event.preventDefault();

  if (editing.value === undefined) {
    emit('close');
  } else {
    stopEdit();
  }
};

const focusBack = (index: number | undefined): void => {
  const target =
    index === undefined || index === ADD_BUTTON
      ? undefined
      : ruleElements(list.value)[index]?.querySelector('.nui-spreadsheet-rules__actions button');

  if (target instanceof HTMLElement) {
    target.focus();
  } else {
    (addButton.value ?? closeButton.value)?.$el.focus();
  }
};

const focusRule = (key: string | undefined): void => {
  const at = shown.value.findIndex((row) => row.key === key);
  const element = ruleElements(list.value)[at];
  const target = element?.querySelector('button');

  if (target instanceof HTMLElement) {
    target.focus();
  } else {
    closeButton.value?.$el.focus();
  }
};

watch(
  () => shown.value.map((row) => row.key).join(' '),
  () => {
    const key = focusAfter.value;

    if (key !== undefined || shown.value.length === 0) {
      focusAfter.value = undefined;
      focusRule(key);
    }
  },
  { flush: 'post' },
);

const focusStart = (): void => {
  closeButton.value?.$el.focus();
};

watch(
  editing,
  (next, before) => {
    if (next === undefined && before !== undefined) {
      focusBack(backTo.value);
      backTo.value = undefined;
    }
  },
  { flush: 'post' },
);

defineExpose({ focusStart });
</script>
