import { describe, expect, it } from 'vitest';
import { EmptyDriver } from './drivers/empty';

describe('NuiEmpty', () => {
  it('renders the inbox icon, title and description by default and hides the icon on request', () => {
    const empty = EmptyDriver.mount({
      props: { title: 'Nothing here', description: 'Add your first item' },
    });

    expect(empty.hasModifier('size-md')).toBe(true);
    expect(empty.hasIcon).toBe(true);
    expect(empty.titleText).toBe('Nothing here');
    expect(empty.bodyText).toBe('Add your first item');
    expect(empty.actionsText).toBe('');
    const bare = EmptyDriver.mount({ props: { title: 'No matches', hideIcon: true, size: 'sm' } });
    expect(bare.hasModifier('size-sm')).toBe(true);
    expect(bare.hasMedia).toBe(false);
    expect(bare.titleText).toBe('No matches');
    expect(bare.bodyText).toBe('');
  });

  it('accepts media, title, description and actions through slots', () => {
    const empty = EmptyDriver.mount({
      props: { hideIcon: true },
      slots: {
        media: '<svg class="art"></svg>',
        title: 'Пусто',
        default: 'Попробуйте другой запрос',
        actions: '<button type="button">Повторить</button>',
      },
    });

    expect(empty.hasMedia).toBe(true);
    expect(empty.hasIcon).toBe(false);
    expect(empty.wrapper.find('.art').exists()).toBe(true);
    expect(empty.titleText).toBe('Пусто');
    expect(empty.bodyText).toBe('Попробуйте другой запрос');
    expect(empty.actionsText).toBe('Повторить');
  });
});
