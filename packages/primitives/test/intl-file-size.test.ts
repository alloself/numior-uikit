import { describe, expect, it } from 'vite-plus/test';
import { formatFileSize } from '../src';

describe('formatFileSize', () => {
  it('picks the unit by powers of 1024 and formats through Intl', () => {
    expect(formatFileSize(0, 'en-US')).toBe('0 byte');
    expect(formatFileSize(512, 'en-US')).toBe('512 byte');
    expect(formatFileSize(1536, 'en-US')).toBe('1.5 kB');
    expect(formatFileSize(5 * 1024 * 1024, 'en-US')).toBe('5 MB');
    expect(formatFileSize(3.25 * 1024 ** 3, 'en-US')).toBe('3.3 GB');
    expect(formatFileSize(1536, 'ru-RU')).toBe('1,5 кБ');
    expect(formatFileSize(Number.NaN, 'en-US')).toBe('0 byte');
  });
});
