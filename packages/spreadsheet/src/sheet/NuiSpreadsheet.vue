<template>
  <div
    v-if="table !== undefined"
    ref="root"
    class="nui-spreadsheet"
    :dir="table.cells.rightToLeft ? 'rtl' : 'ltr'"
    @keydown.capture="onKeydown"
    @input="assist.syncCaret"
    @keyup="assist.syncCaret"
    @focusin="assist.syncCaret"
    @pointermove="onPointermove"
    @pointerup="onPointerup"
    @pointercancel="onPointercancel"
  >
    <div
      v-if="formulaBar"
      ref="bar"
      class="nui-spreadsheet__bar"
      :class="{ 'nui-spreadsheet__bar--expanded': formula.expanded.value }"
    >
      <input
        ref="nameField"
        class="nui-spreadsheet__name"
        :class="{ 'nui-spreadsheet__name--invalid': formula.nameInvalid.value }"
        :value="formula.nameText.value"
        :aria-label="messages.nameBox"
        :aria-invalid="formula.nameInvalid.value"
        autocomplete="off"
        spellcheck="false"
        @focus="formula.onNameFocus"
        @input="formula.onNameInput"
        @keydown="formula.onNameKeydown"
        @blur="formula.onNameBlur"
      />
      <span class="nui-spreadsheet__entry">
        <span class="nui-spreadsheet__fx" aria-hidden="true"></span>
        <span class="nui-spreadsheet__field">
          <span
            ref="mirror"
            class="nui-spreadsheet__mirror"
            :class="{ 'nui-spreadsheet__mirror--shown': painted }"
            dir="auto"
            aria-hidden="true"
          >
            <span
              v-for="segment in references.segments.value"
              :key="segment.key"
              :class="
                segment.tone === undefined
                  ? undefined
                  : ['nui-spreadsheet__token', `nui-spreadsheet__token--tone-${segment.tone}`]
              "
              >{{ segment.text }}</span
            >
          </span>
          <textarea
            :id="formulaId"
            ref="formulaField"
            class="nui-spreadsheet__formula"
            :class="{ 'nui-spreadsheet__formula--painted': painted }"
            :value="formula.formulaText.value"
            :readonly="readonly"
            :aria-label="messages.formulaBar"
            rows="1"
            dir="auto"
            autocomplete="off"
            spellcheck="false"
            @focus="formula.onFormulaFocus"
            @input="formula.onFormulaInput"
            @keydown="formula.onFormulaKeydown"
            @blur="formula.onFormulaBlur"
            @scroll="followScroll"
          ></textarea>
        </span>
        <span class="nui-spreadsheet__expand">
          <NuiButton
            variant="ghost"
            tone="neutral"
            size="xs"
            icon-only
            :aria-label="messages.expandFormula"
            :aria-expanded="formula.expanded.value"
            :aria-controls="formulaId"
            @click="formula.toggle"
          >
            <NuiIcon
              icon="chevron-down"
              :transform="{ rotate: formula.expanded.value ? 180 : 0 }"
            />
          </NuiButton>
        </span>
      </span>
    </div>
    <NuiTable
      ref="grid"
      v-model:active="formula.active.value"
      v-model:ranges="formula.ranges.value"
      v-bind="table.grid"
      :draft="editing.draft.value"
      :columns="table.columns"
      :merges="table.cells.merges"
      :frozen-rows="table.cells.frozenRows"
      :row-heights="table.cells.rowHeights"
      :row-height="table.rowHeight"
      :bordered="table.cells.gridlines"
      :height="height"
      :column-menu="false"
      :commands="clipboard.commands"
      :clipboard="clipboard.hooks"
      :keep-editing="formula.keepEditing"
      grow-editor
      :picking="references.picking"
      :context-menu="lines.menu"
      :label="label"
      size="sm"
      @update:draft="editing.setDraft"
      @pick="references.onPick"
    >
      <template #overlay="{ rectOf }">
        <NuiSpreadsheetMarks
          :rect-of="rectOf"
          :handle="fill.handle.value"
          :preview="fill.preview.value"
          :clips="clipboard.frames.value"
          @grip="fill.onDown"
          @fill="fill.onDblclick"
        />
        <NuiSpreadsheetReference
          v-for="frame in references.frames.value"
          :key="frame.key"
          :tone="frame.tone"
          :rect="rectOf(frame.range)"
          :passive="editing.draft.value === undefined"
          @grip="(event, grip) => references.onGripDown(event, frame, grip)"
        />
      </template>
    </NuiTable>
    <div class="nui-spreadsheet__hidden" role="status" aria-live="polite">
      {{ formula.announcement.value }}
    </div>
    <NuiSpreadsheetAssist
      :list-id="assist.listId"
      :hint-id="assist.hintId"
      :entries="assist.entries.value"
      :active="assist.active.value"
      :anchor="assist.anchor.value"
      :open="assist.open.value"
      :hint="assist.hint.value"
      :summary="assist.summary.value"
      :typed="assist.typed.value"
      :label="messages.functions"
      :hint-label="messages.arguments"
      @choose="assist.choose"
      @hover="assist.hover"
    />
    <NuiSpreadsheetTabs
      :shown="sheetTabs"
      :tabs="tabs"
      :current="String(sheetIndex)"
      :readonly="readonly"
      :messages="messages"
      @select="selectSheet"
      @add="addSheet"
      @rename="renameSheet"
      @remove="removeSheet"
      @undo="editing.commands.undo"
      @redo="editing.commands.redo"
    />
  </div>
</template>

<script setup lang="ts">
import { Key, useLocale, useMessages } from '@numior/primitives';
import { NuiTable, tableCells, type NuiTableColumn, type NuiTableExposed } from '@numior/table';
import { NuiButton, NuiIcon, type NuiTabDescriptor } from '@numior/vue';
import { computed, ref, useId, useTemplateRef } from 'vue';
import { EN_LOCALE, HelpLanguage, RU_LOCALE, createCalculator, type BookLocale } from '../core';
import { defaultRowHeight, sheetCells } from './sheet-cells';
import NuiSpreadsheetAssist from './NuiSpreadsheetAssist.vue';
import NuiSpreadsheetMarks from './NuiSpreadsheetMarks.vue';
import NuiSpreadsheetReference from './NuiSpreadsheetReference.vue';
import NuiSpreadsheetTabs from './NuiSpreadsheetTabs.vue';
import type {
  FormulaSegment,
  NuiSpreadsheetChange,
  NuiSpreadsheetExposed,
  NuiSpreadsheetProps,
  NuiSpreadsheetSelection,
} from './sheet.types';
import { spreadsheetMessages } from './spreadsheet.messages';
import { useFormulaAssist } from './use-formula-assist';
import { useFormulaBar } from './use-formula-bar';
import { useSheetClipboard } from './use-sheet-clipboard';
import { useSheetEditing } from './use-sheet-editing';
import { useSheetFill } from './use-sheet-fill';
import { useSheetLines } from './use-sheet-lines';
import { useSheetReferences } from './use-sheet-references';
import { useSheetSelection } from './use-sheet-selection';

const {
  book,
  calculator,
  label,
  locale,
  height = '28rem',
  readonly = false,
  formulaBar = true,
  sheetTabs = true,
  contextMenu,
} = defineProps<NuiSpreadsheetProps>();

const sheetIndex = defineModel<number>('sheet', { default: 0 });

const selectionModel = defineModel<NuiSpreadsheetSelection | undefined>('selection');

const emit = defineEmits<{
  change: [change: NuiSpreadsheetChange];
}>();

const root = useTemplateRef<HTMLElement>('root');
const bar = useTemplateRef<HTMLElement>('bar');
const nameField = useTemplateRef<HTMLInputElement>('nameField');
const formulaField = useTemplateRef<HTMLTextAreaElement>('formulaField');
const mirror = useTemplateRef<HTMLElement>('mirror');
const grid = useTemplateRef<NuiTableExposed>('grid');

const formulaId = useId();

const kitLocale = useLocale(() => undefined);

const messages = useMessages(spreadsheetMessages);

const bookLocale = computed(
  (): BookLocale => locale ?? (kitLocale.value.startsWith('ru') ? RU_LOCALE : EN_LOCALE),
);

const sheetsRevision = ref(0);

const sheetsKey = (): string =>
  book.sheets.map((each) => `${String(each.id)}:${each.name}`).join('/');

let knownSheets = sheetsKey();

const sheetList = computed(() => (sheetsRevision.value >= 0 ? [...book.sheets] : []));

const shownIndex = computed(() =>
  Math.max(0, Math.min(sheetIndex.value, sheetList.value.length - 1)),
);

const shownSheet = computed(() => sheetList.value[shownIndex.value]);

const tabs = computed((): NuiTabDescriptor[] =>
  sheetList.value.map((each, index) => ({ value: String(index), label: each.name })),
);

const ownCalculator = computed(() => createCalculator(book, { locale: bookLocale.value }));

const cells = computed(() =>
  shownSheet.value === undefined
    ? undefined
    : sheetCells({ book, sheet: shownSheet.value, locale: bookLocale.value }),
);

const editing = useSheetEditing({
  book: () => book,
  calculator: () => calculator ?? ownCalculator.value,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  locale: () => bookLocale.value,
  readonly: () => readonly,
  messages,
  table: grid,
  changed: (change) => {
    const next = sheetsKey();

    if (next !== knownSheets) {
      const before = shownSheet.value;
      const kept = before === undefined ? -1 : book.sheets.indexOf(before);

      knownSheets = next;
      sheetsRevision.value += 1;

      if (kept >= 0) {
        sheetIndex.value = kept;
      }
    }
    emit('change', change);
  },
});

const clipboard = useSheetClipboard({
  book: () => book,
  calculator: () => calculator ?? ownCalculator.value,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  editing,
});

const formula = useFormulaBar({
  book: () => book,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  readonly: () => readonly,
  messages,
  editing,
  table: grid,
  root,
  bar,
  nameField,
  formulaField,
});

const selection = useSheetSelection({
  cells: () => cells.value,
  formula,
  table: grid,
  model: selectionModel,
});

const fill = useSheetFill({
  book: () => book,
  calculator: () => calculator ?? ownCalculator.value,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  editing,
  selection,
  table: grid,
  root,
  readonly: () => readonly,
});

const lines = useSheetLines({
  sheet: () => shownSheet.value,
  selection,
  editing,
  messages,
  readonly: () => readonly,
  extra: () => contextMenu,
  announce: (text) => {
    formula.announcement.value = text;
  },
});

const references = useSheetReferences({
  text: () => formula.formulaText.value,
  cells: () => cells.value,
  sheet: () => shownSheet.value,
  locale: () => bookLocale.value,
  editing,
  table: grid,
  root,
  nameField,
});

const assist = useFormulaAssist({
  locale: () => bookLocale.value,
  language: () => (kitLocale.value.startsWith('ru') ? HelpLanguage.Ru : HelpLanguage.En),
  editing,
  root,
  nameField,
});

const isToned = (segment: FormulaSegment): boolean => segment.tone !== undefined;

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.Escape && editing.draft.value === undefined) {
    clipboard.forget();
  }

  fill.onKeydown(event);
  assist.onKeydown(event);

  if (!event.defaultPrevented) {
    references.onKeydown(event);
  }
};

const onPointermove = (event: PointerEvent): void => {
  references.onGripMove(event);
  fill.onMove(event);
};

const onPointerup = (): void => {
  references.onGripUp();
  fill.onUp();
  assist.syncCaret();
};

const onPointercancel = (): void => {
  references.onGripUp();
  fill.onCancel();
};

const painted = computed(
  () => editing.draft.value !== undefined || references.segments.value.some(isToned),
);

const followScroll = (): void => {
  const field = formulaField.value;

  if (field !== null && mirror.value !== null) {
    mirror.value.scrollTop = field.scrollTop;
    mirror.value.scrollLeft = field.scrollLeft;
  }
};

const pinned = (
  columns: readonly NuiTableColumn<number>[],
  count: number,
): NuiTableColumn<number>[] =>
  columns.map((column, index) => (index < count ? { ...column, pin: 'start' } : column));

const table = computed(() => {
  const shown = shownSheet.value;
  const current = cells.value;

  if (shown === undefined || current === undefined) {
    return undefined;
  }

  const { columns, ...rest } = tableCells(current.source);

  return {
    cells: current,
    grid: rest,
    columns: editing.editableColumns(pinned(columns, current.frozenCols)),
    rowHeight: defaultRowHeight(shown),
  };
});

const freeSheetName = (): string => {
  const taken = new Set(book.sheets.map((each) => each.name.toLowerCase()));

  const free = Array.from({ length: taken.size + 1 }, (_, index) =>
    messages.value.newSheet({ index: taken.size + index + 1 }),
  ).find((name) => !taken.has(name.toLowerCase()));

  return free ?? messages.value.newSheet({ index: taken.size * 2 + 2 });
};

const selectSheet = (index: number): void => {
  sheetIndex.value = index;
};

const addSheet = (index: number): void => {
  if (editing.apply([{ kind: 'addSheet', name: freeSheetName(), index }])) {
    sheetIndex.value = index;
  }
};

const renameSheet = (index: number, name: string): void => {
  const from = book.sheets[index]?.name;

  if (from !== undefined && from !== name) {
    editing.apply([{ kind: 'renameSheet', from, to: name }]);
  }
};

const removeSheet = (index: number): void => {
  const name = book.sheets[index]?.name;

  if (name !== undefined && editing.apply([{ kind: 'removeSheet', name }])) {
    sheetIndex.value = Math.min(index, book.sheets.length - 1);
  }
};

const refresh = (): void => {
  grid.value?.invalidate();
};

defineExpose<NuiSpreadsheetExposed>({ refresh, apply: editing.apply });
</script>
