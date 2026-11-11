<template>
  <div
    v-if="table !== undefined"
    ref="root"
    class="nui-spreadsheet"
    :class="rootClasses"
    @keydown.capture="onKeydown"
    @paste.capture="pictureInsert.onPaste"
    @pointerdown.capture="drawingEdit.onRootDown"
    @input="assist.syncCaret"
    @keyup="assist.syncCaret"
    @focusin="assist.syncCaret"
    @pointermove="onPointermove"
    @pointerup="onPointerup"
    @pointercancel="onPointercancel"
  >
    <NuiSpreadsheetFile ref="fileView" :file="file" :bar="fileBar" :messages="messages" />
    <NuiSpreadsheetReport
      :report="report"
      :messages="messages"
      :recalculated="importedDone"
      @recalculate="recalculateImported"
    />
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
              :class="toneClasses(segment.tone)"
              >{{ segment.text }}</span
            >
          </span>
          <textarea
            :id="formulaId"
            ref="formulaField"
            class="nui-spreadsheet__formula"
            :class="{ 'nui-spreadsheet__formula--painted': painted }"
            :value="formula.formulaText.value"
            :readonly="locked"
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
    <div ref="body" class="nui-spreadsheet__body">
      <NuiTable
        ref="grid"
        :dir="sheetDir"
        v-model:active="formula.active.value"
        v-model:ranges="formula.ranges.value"
        v-model:widths="columnSizes.widths.value"
        v-bind="table.grid"
        :draft="editing.draft.value"
        :columns="table.columns"
        :merges="table.cells.merges"
        :frozen-rows="table.cells.frozenRows"
        :row-heights="table.cells.rowHeights"
        :row-height="table.rowHeight"
        :gridlines="table.cells.gridlines"
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
        @column-resize="columnSizes.commit"
      >
        <template #overlay="{ rectOf }">
          <NuiSpreadsheetDrawings
            :drawings="drawings"
            :rect-of="rectOf"
            :near="lineNear"
            :frozen-rows="table.cells.frozenRows"
            :frozen-cols="table.cells.frozenCols"
            :selected="drawingEdit.selectedId.value"
            :moving="drawingEdit.moving.value"
            :editable="drawingEdit.editable.value"
            :settings-label="messages.chartSettings"
            @down="drawingEdit.onDown"
            @grip="drawingEdit.onGripDown"
            @select="drawingEdit.select"
            @settings="drawingEdit.openSettings"
          />
          <NuiSpreadsheetMarks
            :rect-of="rectOf"
            :handle="fill.handle.value"
            :preview="fill.preview.value"
            :clearing="fill.clearing.value"
            :clips="clipboard.frames.value"
            :lit="litFrames"
            :frozen-rows="table.cells.frozenRows"
            :frozen-cols="table.cells.frozenCols"
            @grip="fill.onDown"
            @fill="fill.onDblclick"
          />
          <NuiSpreadsheetPeers
            :peers="peers"
            :sheet="shownSheet?.name"
            :cells="cells"
            :rect-of="rectOf"
          />
          <NuiSpreadsheetReference
            v-for="frame in references.frames.value"
            :key="frame.key"
            :tone="frame.tone"
            :rect="rectOf(frame.range)"
            :passive="editing.draft.value === undefined"
            :first-row="frame.firstRow"
            :first-col="frame.firstCol"
            @grip="(event, grip) => references.onGripDown(event, frame, grip)"
          />
          <span
            v-for="anchor in anchorsOf(rectOf)"
            :key="anchor.key"
            :ref="anchor.hold"
            class="nui-spreadsheet__anchor"
            :style="rectStyle(anchor.rect)"
          ></span>
        </template>
      </NuiTable>
      <NuiSpreadsheetStatus
        :phase="recalc.phase.value"
        :progress="recalc.progress.value"
        :messages="messages"
        @stop="recalc.stop"
        @resume="recalc.resume"
        @leave="formula.backToGrid"
      />
      <NuiSpreadsheetNote
        :text="note.text.value"
        :shown="note.shown.value"
        :lifted="recalc.phase.value !== RecalcPhase.Idle"
        @hold="note.hold"
        @release="note.release"
        @close="note.hide"
      />
    </div>
    <NuiPopover
      v-model:open="rules.open.value"
      :anchor="rules.anchor.value"
      placement="bottom-start"
      size="auto"
      padding="none"
      fit
      role="dialog"
      :aria-labelledby="rules.titleId"
      @toggle="rules.onToggle"
    >
      <NuiSpreadsheetRules
        v-if="rules.shown.value"
        ref="rulesPanel"
        :title-id="rules.titleId"
        :formats="sheetFormats"
        :selection="selectedRanges"
        :looks="ruleLooks"
        :readonly="locked"
        @close="rules.hide"
        @change="setFormats"
        @hover="lightUp"
      />
    </NuiPopover>
    <NuiSpreadsheetPivotPopover ref="pivotPanel" :pivots="pivots" :readonly="locked" />
    <NuiSpreadsheetChartPopover ref="chartPanel" :settings="chartSettings" :texts="messages" />
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
      @select="assist.choose"
      @hover="assist.hover"
    />
    <NuiSpreadsheetTabs
      :shown="sheetTabs"
      :tabs="tabs"
      :current="String(shownSheet?.id)"
      :readonly="locked"
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
import { PaintRoller } from '@lucide/vue';
import { Direction, Key, isComposing, useLocale, useMessages } from '@numior/primitives';
import {
  NuiTable,
  tableCells,
  type NuiTableColumn,
  type NuiTableExposed,
  type NuiTableOverlaySlot,
  type NuiTableRect,
  type NuiTableCellPosition,
} from '@numior/table';
import { NuiButton, NuiIcon, NuiPopover, type NuiTabDescriptor } from '@numior/vue';
import { useFocusWithin } from '@vueuse/core';
import {
  computed,
  markRaw,
  onMounted,
  provide,
  ref,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import {
  EN_LOCALE,
  HelpLanguage,
  RU_LOCALE,
  StepKind,
  createCalculator,
  type BookLocale,
  type CellRange,
  type ConditionalFormat,
} from '../core';
import { defaultRowHeight, sheetCells } from './sheet-cells';
import { liveSource, sameColumns, type ColumnShape } from './sheet-table';
import { useSheetColumnSizes } from './use-sheet-column-sizes';
import NuiSpreadsheetAssist from './NuiSpreadsheetAssist.vue';
import NuiSpreadsheetMarks from './NuiSpreadsheetMarks.vue';
import NuiSpreadsheetNote from './NuiSpreadsheetNote.vue';
import NuiSpreadsheetPeers from './NuiSpreadsheetPeers.vue';
import NuiSpreadsheetReference from './NuiSpreadsheetReference.vue';
import { placeKey } from './sheet-peers';
import { stepRefusalText } from './sheet-refusals';
import { useSheetNote } from './use-sheet-note';
import NuiSpreadsheetReport from './NuiSpreadsheetReport.vue';
import NuiSpreadsheetStatus from './NuiSpreadsheetStatus.vue';
import NuiSpreadsheetTabs from './NuiSpreadsheetTabs.vue';
import NuiSpreadsheetChartPopover from './drawings/NuiSpreadsheetChartPopover.vue';
import NuiSpreadsheetDrawings from './drawings/NuiSpreadsheetDrawings.vue';
import type { LineNear } from './drawings/drawings.types';
import { useSheetChartInsert } from './drawings/use-sheet-chart-insert';
import { useSheetChartSettings } from './drawings/use-sheet-chart-settings';
import { useSheetDrawingEdit } from './drawings/use-sheet-drawing-edit';
import { useSheetDrawings } from './drawings/use-sheet-drawings';
import { useSheetPictureInsert } from './drawings/use-sheet-picture-insert';
import NuiSpreadsheetFile from './file/NuiSpreadsheetFile.vue';
import type {
  NuiSpreadsheetFile as OpenedFile,
  NuiSpreadsheetSaved,
  SheetFileViewExposed,
} from './file/file.types';
import { useSheetFile } from './file/use-sheet-file';
import NuiSpreadsheetPivotPopover from './pivot/NuiSpreadsheetPivotPopover.vue';
import { useSheetPivots } from './pivot/use-sheet-pivots';
import NuiSpreadsheetRules from './rules/NuiSpreadsheetRules.vue';
import { spreadsheetRulesMessages } from './rules/rules.messages';
import type { RuleLooks } from './rules/rules.types';
import {
  RecalcPhase,
  type FormulaSegment,
  type NuiSpreadsheetChange,
  type NuiSpreadsheetRefusal,
  type NuiSpreadsheetRefusalReason,
  type NuiSpreadsheetExposed,
  type NuiSpreadsheetProps,
  type NuiSpreadsheetPlace,
  type NuiSpreadsheetSelection,
  type SheetAnchor,
  type SheetClipFrame,
} from './sheet.types';
import { spreadsheetMessages } from './spreadsheet.messages';
import { useFormulaAssist } from './use-formula-assist';
import { useFormulaBar } from './use-formula-bar';
import { useSheetClipboard } from './use-sheet-clipboard';
import { useSheetEditing } from './use-sheet-editing';
import { useSheetFill } from './use-sheet-fill';
import { useSheetLines } from './use-sheet-lines';
import { useSheetPopover } from './use-sheet-popover';
import { useSheetRecalc } from './use-sheet-recalc';
import { SHEET_SEGMENTS } from './sheet-segments';
import { rectStyle } from './sheet-rect';
import { useSheetReferences } from './use-sheet-references';
import { tableRangeOf, useSheetSelection } from './use-sheet-selection';

const RULES_ICON = markRaw(PaintRoller);

const toneClasses = (tone: number | undefined): string[] | undefined =>
  tone === undefined
    ? undefined
    : ['nui-spreadsheet__token', `nui-spreadsheet__token--tone-${String(tone)}`];

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
  report,
  fileBar = false,
  fileName,
  source,
  saveFile,
  collaboration,
  peers = [],
} = defineProps<NuiSpreadsheetProps>();

const sheetIndex = defineModel<number>('sheet', { default: 0 });

const selectionModel = defineModel<NuiSpreadsheetSelection | undefined>('selection');

const emit = defineEmits<{
  change: [change: NuiSpreadsheetChange];
  open: [file: OpenedFile];
  saved: [saved: NuiSpreadsheetSaved];
  presence: [place: NuiSpreadsheetPlace | undefined];
  refuse: [refusal: NuiSpreadsheetRefusal];
}>();

const root = useTemplateRef<HTMLElement>('root');
const bar = useTemplateRef<HTMLElement>('bar');
const nameField = useTemplateRef<HTMLInputElement>('nameField');
const formulaField = useTemplateRef<HTMLTextAreaElement>('formulaField');
const mirror = useTemplateRef<HTMLElement>('mirror');
const grid = useTemplateRef<NuiTableExposed>('grid');
const fileView = useTemplateRef<SheetFileViewExposed>('fileView');
const body = useTemplateRef<HTMLElement>('body');

const formulaId = useId();

const kitLocale = useLocale(() => undefined);

const messages = useMessages(spreadsheetMessages);

const note = useSheetNote();

const refuse = (reason: NuiSpreadsheetRefusalReason, message: string): void => {
  formula.announcement.value = message;
  note.show(message);
  emit('refuse', { reason, message });
};

const ruleTexts = useMessages(spreadsheetRulesMessages);

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
  sheetList.value.map((each) => ({ value: String(each.id), label: each.name })),
);

let ownLocale = bookLocale.value;

const ownCalculator = computed(() => createCalculator(book, { locale: ownLocale }));

const locked = computed(() => readonly || report?.readOnly === true);

const importedDone = ref(false);

const recalc = useSheetRecalc({
  calculator: () => calculator ?? ownCalculator.value,
  table: grid,
});

const layoutRevision = ref(0);

let knownLayout = shownSheet.value?.layout;

const cells = computed(() =>
  shownSheet.value === undefined || layoutRevision.value < 0
    ? undefined
    : sheetCells({
        book,
        sheet: shownSheet.value,
        locale: bookLocale.value,
        outdated: recalc.outdated,
        calculator: calculator ?? ownCalculator.value,
      }),
);

const file = useSheetFile({
  book: () => book,
  calculator: () => calculator ?? ownCalculator.value,
  source: () => source,
  fileName: () => fileName,
  locale: () => bookLocale.value,
  adapter: () => saveFile,
  hotkeys: () => fileBar,
  messages,
  commitDraft: () => {
    grid.value?.commitEdit();
  },
  pick: () => {
    fileView.value?.pick();
  },
  opened: (opened) => {
    sheetIndex.value = 0;
    emit('open', opened);
  },
  saved: (saved) => {
    emit('saved', saved);
  },
  announce: (text) => {
    formula.announcement.value = text;
  },
});

const noteStructure = (): void => {
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
  if (shownSheet.value?.layout !== knownLayout) {
    knownLayout = shownSheet.value?.layout;
    layoutRevision.value += 1;
    grid.value?.cancelEdit();
  }
  file.noteEdit();
};

const editing = useSheetEditing({
  book: () => book,
  calculator: () => calculator ?? ownCalculator.value,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  locale: () => bookLocale.value,
  readonly: () => locked.value,
  messages,
  table: grid,
  recalc,
  collaboration: () => collaboration,
  changed: (change) => {
    note.hide();
    noteStructure();
    emit('change', change);
  },
  refused: (refusal, message) => {
    refuse(refusal, message ?? stepRefusalText(refusal, messages.value));
  },
});

const columnSizes = useSheetColumnSizes({
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  readonly: () => locked.value,
  editing,
});

watch([shownSheet, layoutRevision], columnSizes.forget);

const onRemoteSteps = (): void => {
  noteStructure();
  editing.redraw();
};

onMounted(() => {
  watch(
    () => collaboration,
    (session, _previous, onCleanup) => {
      if (session === undefined) {
        return;
      }

      onCleanup(session.subscribe(onRemoteSteps));
    },
    { immediate: true },
  );
});

const drawings = useSheetDrawings({
  book: () => book,
  sheet: () => shownSheet.value,
  locale: () => bookLocale.value,
  messages: () => messages.value,
  revision: () => editing.revision.value + recalc.revision.value + layoutRevision.value,
});

const lineNear: LineNear = {
  row: (line) => cells.value?.rowNear(line) ?? line,
  col: (line) => cells.value?.colNear(line) ?? line,
};

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
  readonly: () => locked.value,
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

const place = computed((): NuiSpreadsheetPlace | undefined => {
  const chosen = selection.current.value;
  const name = tabs.value[shownIndex.value]?.label;

  return chosen === undefined || name === undefined
    ? undefined
    : { sheet: name, selection: chosen };
});

watch(
  () => placeKey(place.value),
  () => {
    emit('presence', place.value);
  },
);

const fill = useSheetFill({
  book: () => book,
  calculator: () => calculator ?? ownCalculator.value,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  editing,
  selection,
  table: grid,
  root,
  readonly: () => locked.value,
  messages,
  refuse: (reason, message) => {
    refuse(reason, message);
  },
});

const pivotPanel = useTemplateRef<{ focusStart(): void }>('pivotPanel');

const chartPanel = useTemplateRef<{ focusStart(): void }>('chartPanel');

const pivots = useSheetPivots({
  book: () => book,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  selection,
  editing,
  formula,
  refuse: (reason, message) => {
    refuse(reason, message);
  },
  sheetIndex,
  readonly: () => locked.value,
  locale: () => bookLocale.value,
  focusPanel: () => pivotPanel.value?.focusStart(),
});

const lines = useSheetLines({
  sheet: () => shownSheet.value,
  selection,
  editing,
  messages,
  readonly: () => locked.value,
  extra: () => contextMenu,
  tools: () => [
    {
      key: 'rules',
      label: ruleTexts.value.openRules,
      icon: RULES_ICON,
      onSelect: () => openRules(),
    },
    ...pivots.tools(),
    ...chartInsert.tools(),
    ...pictureInsert.tools(),
  ],
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

provide(SHEET_SEGMENTS, references.segments);

const { focused: inSheet } = useFocusWithin(body);

const rootClasses = computed(() => ({
  'nui-spreadsheet--dragging': references.dragging.value || drawingEdit.dragging.value,
  'nui-spreadsheet--focused': inSheet.value,
}));

const sheetDir = computed(() =>
  table.value?.cells.rightToLeft === true ? Direction.Rtl : Direction.Ltr,
);

const drawingEdit = useSheetDrawingEdit({
  sheet: () => shownSheet.value,
  drawings: () => drawings.value,
  readonly: () => locked.value,
  rtl: () => sheetDir.value === Direction.Rtl,
  messages: () => messages.value,
  announce: (text) => {
    formula.announcement.value = text;
  },
  focus: () => {
    formula.holdFocus();
  },
  openSettings: () => {
    chartSettings.show();
  },
  editing,
  table: grid,
  root,
});

const chartSettings = useSheetChartSettings({
  sheet: () => shownSheet.value,
  selected: () => drawingEdit.selected.value,
  editing,
  root,
  focusPanel: () => {
    chartPanel.value?.focusStart();
  },
  back: () => {
    formula.holdFocus();
  },
});

const chartInsert = useSheetChartInsert({
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  readonly: () => locked.value,
  rtl: () => sheetDir.value === Direction.Rtl,
  messages: () => messages.value,
  refuse: (reason, message) => {
    refuse(reason, message);
  },
  select: (id, name) => {
    drawingEdit.selectNew(id, name);
  },
  selection,
  editing,
  table: grid,
  root,
});

const pictureInsert = useSheetPictureInsert({
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  readonly: () => locked.value,
  rtl: () => sheetDir.value === Direction.Rtl,
  messages: () => messages.value,
  refuse: (reason, message) => {
    refuse(reason, message);
  },
  select: (id, name) => {
    drawingEdit.selectNew(id, name);
  },
  editing,
  table: grid,
  root,
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
  if (isComposing(event)) {
    return;
  }
  file.onKeydown(event);
  drawingEdit.onKeydown(event);

  if (event.defaultPrevented) {
    return;
  }
  if (event.key === Key.Escape && editing.draft.value === undefined) {
    clipboard.forget();
  }

  fill.onKeydown(event);
  assist.onKeydown(event);

  if (event.defaultPrevented) {
    return;
  }

  references.onKeydown(event);
};

const onPointermove = (event: PointerEvent): void => {
  drawingEdit.onMove(event);
  references.onGripMove(event);
  fill.onMove(event);
};

const onPointerup = (): void => {
  drawingEdit.onUp();
  references.onGripUp();
  fill.onUp();
  assist.syncCaret();
};

const onPointercancel = (): void => {
  drawingEdit.onCancel();
  references.onGripUp();
  fill.onCancel();
};

const painted = computed(
  () => editing.draft.value !== undefined || references.segments.value.some(isToned),
);

const followScroll = (): void => {
  const field = formulaField.value;

  if (field === null || mirror.value === null) {
    return;
  }

  mirror.value.scrollTop = field.scrollTop;
  mirror.value.scrollLeft = field.scrollLeft;
};

const pinned = (
  columns: readonly NuiTableColumn<number>[],
  count: number,
): NuiTableColumn<number>[] =>
  columns.map((column, index) => (index < count ? { ...column, pin: 'start' } : column));

const columnShape = computed<ColumnShape | undefined>((previous) => {
  const shown = shownSheet.value;
  const current = cells.value;

  if (shown === undefined || current === undefined) {
    return undefined;
  }

  const next: ColumnShape = {
    sheet: shown,
    lines: shown.layout.cols,
    width: shown.layout.defaults.colWidth,
    frozen: current.frozenCols,
    source: current.source,
  };

  return previous !== undefined && sameColumns(previous, next) ? previous : next;
});

const tableParts = computed(() => {
  const shape = columnShape.value;

  if (shape === undefined) {
    return undefined;
  }

  const built = tableCells(liveSource(shape.source, () => cells.value?.source));

  return {
    built,
    columns: editing.editableColumns(pinned(built.columns, shape.frozen)),
  };
});

const table = computed(() => {
  const shown = shownSheet.value;
  const current = cells.value;
  const parts = tableParts.value;

  if (shown === undefined || current === undefined || parts === undefined) {
    return undefined;
  }

  const { columns: _columns, ...rest } = parts.built;

  return {
    cells: current,
    grid: rest,
    columns: parts.columns,
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
  if (!editing.apply([{ kind: 'addSheet', name: freeSheetName(), index }])) {
    return;
  }

  sheetIndex.value = index;
};

const renameSheet = (index: number, name: string): void => {
  const from = book.sheets[index]?.name;

  if (from === undefined || from === name) {
    return;
  }

  editing.apply([{ kind: 'renameSheet', from, to: name }]);
};

const removeSheet = (index: number): void => {
  const name = book.sheets[index]?.name;

  if (name === undefined || !editing.apply([{ kind: 'removeSheet', name }])) {
    return;
  }

  sheetIndex.value = Math.min(index, book.sheets.length - 1);
};

const rulesCell = shallowRef<NuiTableCellPosition>();

const rulesPanel = useTemplateRef<{ focusStart(): void }>('rulesPanel');

const lit = ref<readonly CellRange[]>();

const rules = useSheetPopover({
  focusStart: () => rulesPanel.value?.focusStart(),
  closed: () => {
    lit.value = undefined;
  },
  back: () => formula.backToGrid(),
});

const sheetFormats = computed((): readonly ConditionalFormat[] =>
  editing.revision.value >= 0 ? (shownSheet.value?.conditional ?? []) : [],
);

const selectedRanges = computed((): readonly CellRange[] => selection.current.value?.ranges ?? []);

const ruleLooks = computed((): RuleLooks => ({
  theme: book.decorations.theme,
  font: book.decorations.defaultFont,
  locale: bookLocale.value,
}));

const litFrames = computed((): readonly SheetClipFrame[] => {
  const current = cells.value;
  const ranges = lit.value ?? [];

  return current === undefined
    ? []
    : ranges.map((range, at) => ({
        key: `lit-${String(at)}`,
        range: tableRangeOf(current, range),
      }));
});

const rulesRect = (rectOf: NuiTableOverlaySlot['rectOf']): NuiTableRect | undefined => {
  const cell = rulesCell.value;

  return cell === undefined ? undefined : rectOf({ from: cell, to: cell });
};

const anchorsOf = (rectOf: NuiTableOverlaySlot['rectOf']): SheetAnchor[] =>
  [
    { key: 'rules', rect: rulesRect(rectOf), hold: rules.holdAnchor },
    { key: 'pivot', rect: pivots.rect(rectOf), hold: pivots.popover.holdAnchor },
  ].reduce<SheetAnchor[]>(
    (shown, anchor) =>
      anchor.rect === undefined ? shown : [...shown, { ...anchor, rect: anchor.rect }],
    [],
  );

const openRules = (): void => {
  rulesCell.value = formula.active.value ?? { row: 0, col: 0 };
  rules.show();
};

const lightUp = (ranges: readonly CellRange[] | undefined): void => {
  lit.value = ranges;
};

const setFormats = (formats: readonly ConditionalFormat[]): void => {
  const sheet = shownSheet.value;

  if (sheet === undefined) {
    return;
  }

  editing.apply([{ kind: StepKind.SetConditional, sheet: sheet.name, formats }]);
};

watch(shownSheet, () => {
  lit.value = undefined;
  drawingEdit.deselect();
});

const refresh = (): void => {
  grid.value?.invalidate();
};

const recalculateImported = (): void => {
  importedDone.value = true;
  formula.backToGrid();
  recalc.run({ imported: true });
};

watch(
  () => report,
  () => {
    importedDone.value = false;
  },
);

watch(recalc.phase, (next, before) => {
  if (next !== RecalcPhase.Idle || before !== RecalcPhase.Running) {
    return;
  }

  formula.announcement.value = messages.value.recalcDone;
});

watch(bookLocale, (next) => {
  ownLocale = next;

  if (calculator !== undefined) {
    return;
  }

  ownCalculator.value.setLocale(next);
  recalc.run();
});

defineExpose<NuiSpreadsheetExposed>({
  refresh,
  apply: editing.apply,
  openRules,
  save: file.save,
  open: file.open,
});
</script>
