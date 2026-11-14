import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Locator } from '@playwright/test';

const THEME_FILE = fileURLToPath(
  new URL('../../../packages/tokens/src/theme.css', import.meta.url),
);

const INLINE_RE = /@theme inline\s*\{([^}]*)\}/u;
const DECLARATION_RE = /(--[a-z0-9-]+):\s*([^;]+);/gu;
const SCHEME_RE = /(?:^|\s)nui-theme--(light|dark|system)(?=\s|$)/u;
const ACCENT_RE = /(?:^|\s)nui-theme--accent-([a-z]+)(?=\s|$)/u;

const derived: ReadonlyMap<string, string> = new Map(
  [...(INLINE_RE.exec(readFileSync(THEME_FILE, 'utf8'))?.[1] ?? '').matchAll(DECLARATION_RE)].map(
    ([, name = '', value = '']) => [name, value.replaceAll(/\s+/gu, ' ').trim()],
  ),
);

const classOf = async (target: Locator): Promise<string> =>
  (await target.getAttribute('class')) ?? '';

export const tokenValueOf = (name: string): string => derived.get(name) ?? `var(${name})`;

export const schemeOf = async (target: Locator): Promise<string | null> =>
  SCHEME_RE.exec(await classOf(target))?.[1] ?? null;

export const accentOf = async (target: Locator): Promise<string | null> =>
  ACCENT_RE.exec(await classOf(target))?.[1] ?? null;
