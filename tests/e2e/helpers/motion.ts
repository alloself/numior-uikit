import type { Locator, Page } from '@playwright/test';

export interface Motion {
  readonly duration: number;
  readonly easing: string;
}

export const SLOW_MOTION = 10_000;

const PAINT = 'Paint';

export const slowMotion = (scope: Locator, token = '--nui-duration-fast'): Promise<void> =>
  scope.evaluate(
    (element, { name, value }) => {
      if (element instanceof HTMLElement) {
        element.style.setProperty(name, value);
      }
    },
    { name: token, value: `${SLOW_MOTION}ms` },
  );

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

export const paintsOver = async (page: Page, duration: number): Promise<number> => {
  const session = await page.context().newCDPSession(page);
  let paints = 0;

  session.on('Tracing.dataCollected', (chunk) => {
    paints += chunk.value.reduce((count, event) => count + (event.name === PAINT ? 1 : 0), 0);
  });

  await session.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { includedCategories: ['devtools.timeline'] },
  });

  await page.waitForTimeout(duration);

  const complete = new Promise<void>((resolve) => {
    session.once('Tracing.tracingComplete', () => {
      resolve();
    });
  });

  await session.send('Tracing.end');
  await complete;
  await session.detach();

  return paints;
};
