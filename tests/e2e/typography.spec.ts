import { expect, test } from './fixtures';
import { expectRgb } from './helpers/color';

test('prose styles bare content, beats page resets and leaves components alone', async ({
  playground,
  typography,
  buttons,
}) => {
  await playground.open();
  await playground.setTheme('light');
  await expect(typography.heading).toHaveCSS('font-size', '24px');
  await expect(typography.heading).toHaveCSS('border-bottom-width', '0px');
  await expect(typography.title).toHaveCSS('font-size', '30px');
  await expect(typography.title).toHaveCSS('font-weight', '700');
  await expect(typography.paragraphAfterTitle()).toHaveCSS('margin-bottom', '24px');
  await expect(typography.paragraphAfterTitle()).toHaveCSS('font-size', '18px');
  await expect(typography.escaped).toHaveCSS('margin-bottom', '0px');
  await expect(typography.last).toHaveCSS('margin-bottom', '0px');
  await expect(typography.small).toHaveCSS('font-size', '14px');
  await expectRgb(typography.link, 'color', [67, 56, 202]);

  expect(await typography.fontOf(typography.button)).toEqual(
    await typography.fontOf(buttons.primary),
  );
});

test('layout and spacing utilities follow the writing direction and the viewport', async ({
  playground,
  typography,
  isMobile,
}) => {
  await playground.open();
  expect(await typography.gridTrackCount()).toBe(isMobile ? 1 : 3);
  await expect(typography.spacingStart).toHaveCSS('margin-left', '16px');
  await expect(typography.spacingStart).toHaveCSS('margin-right', '0px');
  await expect(typography.text2xl).toHaveCSS('font-size', '24px');
  await expect(typography.text2xl).toHaveCSS('white-space', 'nowrap');

  await playground.setDirection('rtl');
  await expect(typography.spacingStart).toHaveCSS('margin-right', '16px');
  await expect(typography.spacingStart).toHaveCSS('margin-left', '0px');
  expect(await playground.hasHorizontalOverflow()).toBe(false);
});
