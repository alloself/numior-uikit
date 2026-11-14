import type { Locator } from '@playwright/test';

const TAB_LIMIT = 30;

const isFocused = (target: Locator): Promise<boolean> =>
  target.evaluate((element) => element === element.ownerDocument.activeElement);

export const tabTo = async (target: Locator, left = TAB_LIMIT): Promise<void> => {
  if (left === 0) {
    throw new Error(`Tab did not reach the target in ${String(TAB_LIMIT)} presses`);
  }

  await target.page().keyboard.press('Tab');

  if (await isFocused(target)) {
    return;
  }

  await tabTo(target, left - 1);
};
