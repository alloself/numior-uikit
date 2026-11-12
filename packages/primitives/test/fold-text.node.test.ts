import { describe, expect, it } from 'vite-plus/test';
import { foldText } from '../src';

describe('text folded for a search', () => {
  it('drops case and Latin accents and reads «ё» as «е»', () => {
    expect(foldText('Crème Brûlée')).toBe('creme brulee');
    expect(foldText('Ёлка и Зелёный')).toBe('елка и зеленый');
    expect(foldText('école')).toBe('ecole');
    expect(foldText('Straße')).toBe('strasse');
  });

  it('keeps letters that are their own in their alphabet', () => {
    expect(foldText('Мой Йод')).toBe('мой йод');
    expect(foldText('IĞDIR', 'tr-TR')).toBe('igdir');
    expect(foldText('İZMİR', 'tr-TR')).toBe('izmir');
  });
});
