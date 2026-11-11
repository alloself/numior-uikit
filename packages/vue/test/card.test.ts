import { describe, expect, it } from 'vite-plus/test';
import { CardDriver } from './drivers/card';

describe('NuiCard', () => {
  it('renders an outline card with sugar title and description and exposes variant and padding', () => {
    const card = CardDriver.mount({ props: { title: 'Plan', description: 'Team seats' } });
    expect(card.hasModifier('variant-outline')).toBe(true);
    expect(card.hasModifier('padding-md')).toBe(true);
    expect(card.hasModifier('interactive')).toBe(false);
    expect(card.hasHeader).toBe(true);
    expect(card.titleTag).toBe('h3');
    expect(card.title.text()).toBe('Plan');
    expect(card.descriptionText).toBe('Team seats');
    expect(card.focusable).toBe(0);

    const plain = CardDriver.mount({ props: { variant: 'soft', padding: 'lg' } });
    expect(plain.hasModifier('variant-soft')).toBe(true);
    expect(plain.hasModifier('padding-lg')).toBe(true);
    expect(plain.hasHeader).toBe(false);

    card.unmount();
    plain.unmount();
  });

  it('takes the tightest step of the padding scale for a dense grid of cards', () => {
    const card = CardDriver.mount({ props: { padding: 'xs', title: 'Orders' } });

    expect(card.hasModifier('padding-xs')).toBe(true);

    card.unmount();
  });

  it('composes header, title tag, content, footer and media parts', () => {
    const card = CardDriver.mount({
      parts: {
        title: 'Release',
        titleAs: 'h2',
        description: 'v1.0',
        actions: true,
        content: 'Body',
        footer: 'Footer',
        media: { src: '/cover.png', alt: 'Cover', aspect: '4 / 3' },
      },
    });

    expect(card.titleTag).toBe('h2');
    expect(card.hasImage).toBe(true);
    expect(card.mediaAspect).toBe('4 / 3');
    expect(card.wrapper.find('.nui-card__content').text()).toBe('Body');
    expect(card.wrapper.find('.nui-card__footer').text()).toBe('Footer');
    expect(card.wrapper.find('.nui-card__actions').exists()).toBe(true);

    card.unmount();
    const placeholder = CardDriver.mount({ parts: { media: {} } });
    expect(placeholder.hasImage).toBe(false);
    expect(placeholder.hasPlaceholder).toBe(true);
    expect(placeholder.mediaAspect).toBe('16 / 9');

    placeholder.unmount();
  });

  it('turns a linked card into one stretched link inside the title', () => {
    const card = CardDriver.mount({
      props: { href: '/plans/team', title: 'Team', description: 'Seats' },
    });

    expect(card.hasModifier('interactive')).toBe(true);
    expect(card.actionTag).toBe('a');
    expect(card.action.attributes('href')).toBe('/plans/team');
    expect(card.action.text()).toBe('Team');
    expect(card.focusable).toBe(1);

    card.unmount();
    const routed = CardDriver.mount({ props: { to: '/guide', title: 'Guide' }, viaRouter: true });
    expect(routed.action.attributes('href')).toBe('/router/guide');

    routed.unmount();
    const headless = CardDriver.mount({ props: { href: '/x' }, parts: { content: 'Body' } });
    expect(headless.focusable).toBe(0);

    headless.unmount();
  });

  it('draws a skeleton in every part while it loads and takes the card action away', async () => {
    const card = CardDriver.mount({
      props: { loading: true, href: '/plans/team' },
      parts: {
        title: 'Team',
        description: 'Seats',
        content: 'Body',
        contentLines: 4,
        footer: 'Footer',
        media: { src: '/cover.png' },
      },
    });

    expect(card.busy).toBe(true);
    expect(card.placeholders).toEqual({ title: 1, description: 1, content: 4, media: 1 });
    expect(card.text).toBe('Footer');
    expect(card.hasImage).toBe(false);
    expect(card.hasModifier('interactive')).toBe(false);
    expect(card.focusable).toBe(0);

    await card.load({ href: '/plans/team' });

    expect(card.busy).toBe(false);
    expect(card.placeholders).toEqual({ title: 0, description: 0, content: 0, media: 0 });
    expect(card.text).toBe('TeamSeatsBodyFooter');
    expect(card.hasImage).toBe(true);
    expect(card.actionTag).toBe('a');

    card.unmount();
  });

  it('draws three lines for a loading content block and a header from its own title', () => {
    const card = CardDriver.mount({
      props: { loading: true, title: 'Plan', description: 'Team seats' },
      parts: { content: 'Body' },
    });

    expect(card.placeholders).toEqual({ title: 1, description: 1, content: 3, media: 0 });
    expect(card.text).toBe('');

    card.unmount();
  });

  it('renders a button card whose nested actions stay independent from the card action', async () => {
    const card = CardDriver.mount({
      props: { interactive: true },
      parts: { title: 'Open', actions: true, content: 'Body' },
    });

    expect(card.actionTag).toBe('button');
    expect(card.action.attributes('type')).toBe('button');

    await card.clickAction();
    expect(card.clicks).toBe(1);

    await card.clickNested();
    expect(card.nestedClicks).toBe(1);
    expect(card.clicks).toBe(1);

    card.unmount();
  });
});
