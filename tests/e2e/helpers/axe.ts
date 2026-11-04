import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export type AxeViolations = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

export const sectionScope = (name: string): string => `section[aria-labelledby="${name}-title"]`;

export const wcagViolationsOf = async (page: Page, scope?: string): Promise<AxeViolations> => {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  const results = await (scope === undefined ? builder : builder.include(scope)).analyze();

  return results.violations;
};
