import { describe, expect, it } from 'vite-plus/test';
import {
  BASE_FUNCTIONS,
  OFFICE_THEME,
  createFunctionRegistry,
  type ConditionalRule,
} from '../src/core';
import { EN_LOCALE } from '../src/core/locale';
import { describeRule } from '../src/sheet/rules/rule-text';
import { rulePreview } from '../src/sheet/rules/rule-preview';
import { spreadsheetRulesMessages } from '../src/sheet/rules/rules.messages';

const FUNCTIONS = createFunctionRegistry(BASE_FUNCTIONS);

const LOOKS = {
  theme: OFFICE_THEME,
  font: { size: 11 },
  locale: EN_LOCALE,
  signatures: (name: string) => FUNCTIONS.get(name),
};

const BOLD = { font: { bold: true } };

const RED = { kind: 'rgb', argb: 'FFF8696B' } as const;

const GREEN = { kind: 'rgb', argb: 'FF63BE7B' } as const;

const rules: readonly ConditionalRule[] = [
  { kind: 'top', rank: 10, percent: true, bottom: false, style: BOLD },
  { kind: 'aboveAverage', below: true, equal: true, deviations: 0, style: BOLD },
  { kind: 'text', operator: 'beginsWith', text: 'Pen', style: BOLD },
  { kind: 'duplicates', style: BOLD },
  { kind: 'timePeriod', period: 'lastWeek', style: BOLD },
  {
    kind: 'colorScale',
    stops: [
      { threshold: { kind: 'min' }, color: RED },
      { threshold: { kind: 'max' }, color: GREEN },
    ],
  },
  {
    kind: 'dataBar',
    min: { kind: 'min' },
    max: { kind: 'max' },
    color: GREEN,
    showValue: true,
  },
  { kind: 'iconSet', set: '3Arrows', thresholds: [], reverse: false, showValue: true },
  { kind: 'foreign', xml: '<cfRule/>' },
];

const describedIn = (language: 'en' | 'ru'): string[] =>
  rules.map((rule) => describeRule(rule, spreadsheetRulesMessages[language], () => ''));

describe('conditional rule descriptions and previews', () => {
  it('describes every kind of rule in English and Russian', () => {
    expect(describedIn('en')).toEqual([
      'Top 10%',
      'Below average or equal',
      'Text begins with “Pen”',
      'Duplicate values',
      'Date is last week',
      '2-color scale',
      'Data bars',
      'Icon set',
      'Rule kept from the file',
    ]);

    expect(describedIn('ru')).toEqual([
      'Первые 10%',
      'Ниже среднего или равно',
      'Текст начинается с «Pen»',
      'Повторяющиеся значения',
      'Дата на прошлой неделе',
      'Цветовая шкала из 2 цветов',
      'Гистограммы',
      'Набор значков',
      'Правило из файла',
    ]);
  });

  it('previews styles, scales, bars and icon sets in their own colours', () => {
    const [top, , , , , scale, bar, icons, foreign] = rules.map((rule) => rulePreview(rule, LOOKS));

    expect(top?.style).toEqual({
      'color-scheme': 'light',
      'font-weight': '700',
      background: '#ffffff',
      color: 'CanvasText',
    });

    expect(scale?.style.background).toBe('linear-gradient(90deg, #F8696B, #63BE7B)');
    expect(bar?.style).toEqual({ '--_bar-color': '#63BE7B' });
    expect(icons?.icons).toHaveLength(3);
    expect(foreign?.kind).toBe('blank');
  });
});
