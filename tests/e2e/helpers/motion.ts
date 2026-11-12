import { expect, type Locator } from '@playwright/test';

export interface Motion {
  readonly duration: number;
  readonly easing: string;
}

export const SLOW_MOTION = 10_000;

export const slowMotion = (scope: Locator, token = '--nui-duration-fast'): Promise<void> =>
  scope.evaluate(
    (element, { name, value }) => {
      if (element instanceof HTMLElement) {
        element.style.setProperty(name, value);
      }
    },
    { name: token, value: `${SLOW_MOTION}ms` },
  );

export const startedClosing = async (popover: Locator): Promise<void> => {
  await expect
    .poll(() => popover.evaluate((element) => element.matches(':popover-open')))
    .toBe(false);
};

export const motionOf = (target: Locator, property: string): Promise<Motion | null> =>
  target.evaluate((element, name) => {
    const running = element
      .getAnimations()
      .find(
        (animation) => animation instanceof CSSTransition && animation.transitionProperty === name,
      );

    const timing = running?.effect?.getComputedTiming();

    return timing === undefined
      ? null
      : { duration: Number(timing.duration), easing: String(timing.easing) };
  }, property);
