import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  EN_FORMULAS,
  createCalculator,
  createStepCodec,
  createWorkbook,
  createWorkbookDocument,
  numberValue,
  parseFormula,
  textValue,
  type CellRange,
  type ConditionalRule,
  type FormulaNode,
  type Workbook,
} from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';
import { stubPopovers } from './support/top-layer';

const mounted: SpreadsheetDriver[] = [];

const formula = (text: string): FormulaNode => {
  const parsed = parseFormula(text, EN_FORMULAS, { row: 0, col: 0 });

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return parsed.ast;
};

const column = (col: number): CellRange => ({ top: 1, left: col, bottom: 9, right: col });

const above: ConditionalRule = {
  kind: 'cellIs',
  operator: 'greaterThan',
  formulas: [formula('10')],
  style: { font: { bold: true } },
};

const blanks: ConditionalRule = {
  kind: 'blanks',
  style: { fill: { pattern: 'solid', background: { kind: 'rgb', argb: 'FFFFC7CE' } } },
};

const rulesBook = (): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');

  sales.cells.set(0, 0, textValue('Item'));
  sales.cells.set(0, 1, textValue('Amount'));
  sales.cells.set(1, 1, numberValue(12));

  sales.conditional = [
    { ranges: [column(0)], rules: [{ rule: blanks, priority: 2, stopIfTrue: false }] },
    { ranges: [column(1)], rules: [{ rule: above, priority: 1, stopIfTrue: false }] },
  ];

  return book;
};

const sheetOf = (book: Workbook): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({ book, label: 'Rules book' });

  mounted.push(driver);
  return driver;
};

const restorers: Array<() => void> = [];

beforeEach(() => {
  restorers.push(stubPopovers());
});

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }

  for (const restore of restorers.splice(0)) {
    restore();
  }
});

describe('NuiSpreadsheet conditional formatting panel', () => {
  it('lists the rules of the sheet by priority and lights the range of a hovered rule', async () => {
    const sheet = sheetOf(rulesBook());

    await sheet.focus(1, 0);
    await sheet.openRules(1, 0);

    expect(sheet.rulesOpen).toBe(true);
    expect(sheet.rulesLabel).toBe('Conditional formatting');
    expect(sheet.focusInRules).toBe(true);
    expect(sheet.ruleTexts).toEqual(['Value is greater than 10', 'Blank cells']);
    expect(sheet.ruleAreas).toEqual(['B2:B10', 'A2:A10']);

    await sheet.hoverRule(0);

    expect(sheet.litFrames).toBe(1);

    await sheet.leaveRule(0);

    expect(sheet.litFrames).toBe(0);

    await sheet.pressInRules('Escape');

    expect(sheet.rulesOpen).toBe(false);
    expect(sheet.focusedCell).toEqual({ row: 1, col: 0 });
  });

  it('drops the popover and the lit range when a click outside dismisses it', async () => {
    const sheet = sheetOf(rulesBook());

    await sheet.focus(1, 1);
    await sheet.openRules(1, 1);
    await sheet.hoverRule(1);

    expect(sheet.litFrames).toBe(1);

    await sheet.dismissRules();

    expect(sheet.rulesOpen).toBe(false);
    expect(sheet.litFrames).toBe(0);

    await sheet.openRules(1, 1);

    expect(sheet.rulesOpen).toBe(true);
    expect(sheet.ruleEditorTitle).toBeUndefined();
  });

  it('keeps only the rules that touch the selection', async () => {
    const sheet = sheetOf(rulesBook());

    await sheet.focus(2, 0);
    await sheet.openRules(2, 0);
    await sheet.showOnlySelection();

    expect(sheet.ruleTexts).toEqual(['Blank cells']);

    await sheet.focus(5, 4);

    expect(sheet.ruleTexts).toEqual([]);
    expect(sheet.rulesEmpty).toBe('No rules touch the selection');
  });

  it('lets go of a rule taken from the keyboard when the focus leaves its grip', async () => {
    const sheet = sheetOf(rulesBook());

    await sheet.focus(1, 0);
    await sheet.openRules(1, 0);
    await sheet.takeRuleAndLeave(0);

    expect(sheet.rulesAnnouncement).toBe('Move cancelled');
    expect(sheet.ruleTexts).toEqual(['Value is greater than 10', 'Blank cells']);
    expect(sheet.changes).toHaveLength(0);
  });

  it('moves and deletes rules as undoable steps', async () => {
    const book = rulesBook();
    const sheet = sheetOf(book);

    await sheet.focus(1, 0);
    await sheet.openRules(1, 0);
    await sheet.moveRuleDown(0);

    expect(sheet.ruleTexts).toEqual(['Blank cells', 'Value is greater than 10']);
    expect(sheet.rulesAnnouncement).toBe('Rule moved to position 2 of 2');
    expect(sheet.changes).toHaveLength(1);

    await sheet.deleteRule(0);

    expect(sheet.ruleTexts).toEqual(['Value is greater than 10']);
    expect(book.sheets[0]?.conditional).toHaveLength(1);
    expect(sheet.focusInRules).toBe(true);

    await sheet.closeRules();
    await sheet.press('z', { ctrl: true });
    await sheet.openRules(1, 0);

    expect(sheet.ruleTexts).toEqual(['Blank cells', 'Value is greater than 10']);
  });

  it('keeps a rule from someone else that arrives before the rule added here is sent', async () => {
    const book = rulesBook();
    const calculator = createCalculator(book);
    const session = createWorkbookDocument({ book, calculator, version: 1 });
    const known = book.sheets[0]?.conditional ?? [];

    const theirs = createStepCodec(book).encode({
      kind: 'setConditional',
      sheet: 'Sales',
      formats: [
        ...known,
        { ranges: [column(2)], rules: [{ rule: blanks, priority: 3, stopIfTrue: false }] },
      ],
      base: known,
    });

    const sheet = SpreadsheetDriver.mount({
      book,
      calculator,
      collaboration: session,
      label: 'Rules book',
    });

    mounted.push(sheet);

    await sheet.focus(2, 1);
    await sheet.openRules(2, 1);
    await sheet.addRule();
    await sheet.fillRuleField('Apply to', 'B2:B9');
    await sheet.chooseRuleOption('Format cells when', 'Data bars');
    await sheet.saveRule();

    session.receive({ version: 1, clientId: 'bob', steps: [theirs] });
    await sheet.settle();

    expect(sheet.ruleTexts).toEqual([
      'Data bars',
      'Value is greater than 10',
      'Blank cells',
      'Blank cells',
    ]);

    expect(session.pending()).toHaveLength(1);
  });

  it('adds a rule on the selection through the editor', async () => {
    const book = rulesBook();
    const sheet = sheetOf(book);

    await sheet.focus(2, 1);
    await sheet.openRules(2, 1);
    await sheet.addRule();

    expect(sheet.ruleEditorTitle).toBe('New rule');
    expect(sheet.ruleField('Apply to')).toBe('B2');
    expect(sheet.focusedRuleField).toBe('Apply to');

    await sheet.fillRuleField('Apply to', 'B2:B9');
    await sheet.chooseRuleOption('Format cells when', 'Data bars');
    await sheet.saveRule();

    expect(sheet.ruleEditorTitle).toBeUndefined();
    expect(sheet.ruleTexts).toEqual(['Data bars', 'Value is greater than 10', 'Blank cells']);
    expect(sheet.ruleAreas[0]).toBe('B2:B9');
    expect(sheet.rulesAnnouncement).toBe('Rule saved');
    expect(sheet.changes).toHaveLength(1);
    expect(sheet.focusInRules).toBe(true);
  });

  it('keeps the editor on the field that cannot be written and saves the fixed rule', async () => {
    const sheet = sheetOf(rulesBook());

    await sheet.focus(1, 1);
    await sheet.openRules(1, 1);
    await sheet.editRule(0);

    expect(sheet.ruleEditorTitle).toBe('Edit rule');
    expect(sheet.ruleField('Value')).toBe('10');

    await sheet.fillRuleField('Value', '');
    await sheet.saveRule();

    expect(sheet.ruleFieldErrors).toHaveLength(1);
    expect(sheet.focusedRuleField).toBe('Value');
    expect(sheet.changes).toHaveLength(0);

    await sheet.fillRuleField('Value', '20');
    await sheet.saveRule();

    expect(sheet.ruleTexts).toEqual(['Value is greater than 20', 'Blank cells']);
    expect(sheet.changes).toHaveLength(1);
  });

  it('leaves the editor with Escape without writing the rule', async () => {
    const sheet = sheetOf(rulesBook());

    await sheet.focus(1, 1);
    await sheet.openRules(1, 1);
    await sheet.editRule(0);
    await sheet.fillRuleField('Value', '30');
    await sheet.openRuleSelect('Condition');
    await sheet.pressInRules('Escape');

    expect(sheet.ruleEditorTitle).toBe('Edit rule');

    await sheet.chooseRuleOption('Condition', 'greater than');
    await sheet.pressInRules('Escape');

    expect(sheet.rulesOpen).toBe(true);
    expect(sheet.ruleEditorTitle).toBeUndefined();
    expect(sheet.ruleTexts).toEqual(['Value is greater than 10', 'Blank cells']);
    expect(sheet.changes).toHaveLength(0);
    expect(sheet.focusedRulesButton).toBe('Edit: Value is greater than 10');
  });
});
