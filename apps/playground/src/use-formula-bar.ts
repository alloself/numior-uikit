import { computed, ref, shallowRef, type ShallowRef } from 'vue';
import {
  cellName,
  rangeName,
  type NuiTableDraft,
  type NuiTableExposed,
  type NuiTableRange,
  type TableCellPosition,
} from '@numior/table';
import type { SheetReference } from './sheet-references';

interface SheetPick {
  readonly text: string;
  readonly at: number;
}

export interface FormulaBarOptions {
  readonly sheet: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly area: Readonly<ShallowRef<HTMLElement | null>>;
  readonly bar: Readonly<ShallowRef<HTMLElement | null>>;
  readonly textAt: (position: TableCellPosition) => string;
  readonly referencesOf: (formula: string) => readonly NuiTableRange[];
}

const OPERATOR = /[=(+\-*/,;:]$/;

const TONES = [
  'var(--nui-primary)',
  'var(--nui-success)',
  'var(--nui-warning)',
  'var(--nui-danger)',
];

const BAR_KEYS: Readonly<Record<string, (table: NuiTableExposed) => void>> = {
  Enter: (table) => {
    table.commitEdit('down');
  },
  Tab: (table) => {
    table.commitEdit('next');
  },
  Escape: (table) => {
    table.cancelEdit();
  },
};

const draftText = (value: unknown): string => (typeof value === 'string' ? value : '');

const nameOf = (position: TableCellPosition | undefined): string =>
  position === undefined ? '' : cellName(position);

export const useFormulaBar = ({ sheet, area, bar, textAt, referencesOf }: FormulaBarOptions) => {
  const active = ref<TableCellPosition>();
  const draft = ref<NuiTableDraft>();
  const lastPick = shallowRef<SheetPick>();

  const barText = computed(() => {
    if (draft.value !== undefined) {
      return draftText(draft.value.value);
    }
    return active.value === undefined ? '' : textAt(active.value);
  });

  const formulaReferences = computed<readonly SheetReference[]>(() => {
    const text = draftText(draft.value?.value);

    return text.startsWith('=')
      ? referencesOf(text).map((range, index) => ({
          range,
          tone: TONES[index % TONES.length] ?? 'var(--nui-primary)',
        }))
      : [];
  });

  const pickAt = (text: string): number => {
    const pick = lastPick.value;

    return pick !== undefined && text.slice(pick.at) === pick.text ? pick.at : text.length;
  };

  const picking = (next: NuiTableDraft): boolean => {
    const text = draftText(next.value);

    return text.startsWith('=') && (OPERATOR.test(text) || pickAt(text) < text.length);
  };

  const inArea = (target: EventTarget | null): boolean =>
    target instanceof Node && area.value?.contains(target) === true;

  const inBar = (target: Element): boolean => bar.value?.contains(target) === true;

  const onPick = (range: NuiTableRange): void => {
    const current = draft.value;
    const text = draftText(current?.value);
    const at = pickAt(text);
    const reference = rangeName(range);

    if (current !== undefined) {
      lastPick.value = { text: reference, at };
      draft.value = { ...current, value: `${text.slice(0, at)}${reference}` };
    }
  };

  const onBarFocus = (): void => {
    sheet.value?.startEdit('append', { focus: false });
  };

  const onBarInput = (text: string): void => {
    if (draft.value !== undefined) {
      draft.value = { ...draft.value, value: text };
    }
  };

  const onBarKeydown = (event: KeyboardEvent): void => {
    const action = BAR_KEYS[event.key];
    const table = sheet.value;

    if (action !== undefined && table !== null) {
      event.preventDefault();
      action(table);
    }
  };

  const onBarBlur = (event: FocusEvent): void => {
    if (!inArea(event.relatedTarget)) {
      sheet.value?.commitEdit('blur');
    }
  };

  return {
    active,
    draft,
    barText,
    formulaReferences,
    nameOf,
    picking,
    inBar,
    onPick,
    onBarFocus,
    onBarInput,
    onBarKeydown,
    onBarBlur,
  };
};
