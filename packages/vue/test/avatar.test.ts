import { describe, expect, it } from 'vite-plus/test';
import { AvatarDriver, AvatarGroupDriver } from './drivers/avatar';

const PEOPLE = [
  { key: 'a', name: 'Alice Brown' },
  { key: 'b', name: 'Bob Stone' },
  { key: 'c', name: 'Cara Lee' },
  { key: 'd', name: 'Dan Wu' },
  { key: 'e', name: 'Eve Park' },
];

describe('NuiAvatar', () => {
  it('renders the image with the name as its label and lets alt override it', () => {
    const avatar = AvatarDriver.mount({ props: { src: '/alice.png', name: 'Alice Brown' } });
    expect(avatar.image.exists()).toBe(true);
    expect(avatar.image.attributes('alt')).toBe('Alice Brown');
    expect(avatar.figure.attributes('role')).toBe('img');
    expect(avatar.label).toBe('Alice Brown');
    expect(avatar.hasModifier('size-md')).toBe(true);
    expect(avatar.hasModifier('shape-circle')).toBe(true);
    expect(avatar.hasModifier('grouped')).toBe(false);

    const described = AvatarDriver.mount({ props: { src: '/a.png', name: 'Alice', alt: 'Photo' } });
    expect(described.label).toBe('Photo');
  });

  it('falls back to initials and then to the user icon', () => {
    expect(AvatarDriver.mount({ props: { name: 'Alice Brown' } }).initials).toBe('AB');
    expect(AvatarDriver.mount({ props: { name: 'Alice' } }).initials).toBe('A');
    expect(AvatarDriver.mount({ props: { name: '  jean  luc  picard ' } }).initials).toBe('JP');
    expect(AvatarDriver.mount({ props: { name: 'анна смирнова' } }).initials).toBe('АС');

    const anonymous = AvatarDriver.mount();
    expect(anonymous.hasIcon).toBe(true);
    expect(anonymous.initials).toBe('');
    expect(anonymous.label).toBeUndefined();
    expect(anonymous.figure.attributes('aria-hidden')).toBe('true');
  });

  it('switches to the fallback when the image fails and retries with a new source', async () => {
    const avatar = AvatarDriver.mount({ props: { src: '/missing.png', name: 'Alice Brown' } });
    await avatar.failImage();
    expect(avatar.image.exists()).toBe(false);
    expect(avatar.initials).toBe('AB');

    await avatar.receive({ src: '/alice.png' });
    expect(avatar.image.exists()).toBe(true);
    expect(avatar.image.attributes('src')).toBe('/alice.png');
  });

  it('exposes status with a spoken label, shape and size modifiers and a badge slot', () => {
    const avatar = AvatarDriver.mount({
      props: { name: 'Alice', status: 'online', shape: 'square', size: 'xl' },
      badge: '3',
    });

    expect(avatar.hasModifier('status-online')).toBe(true);
    expect(avatar.statusLabel).toBe('Online');
    expect(avatar.hasModifier('shape-square')).toBe(true);
    expect(avatar.hasModifier('size-xl')).toBe(true);
    expect(avatar.hasBadge).toBe(true);

    const custom = AvatarDriver.mount({ props: { status: 'busy', statusLabel: 'Занят' } });
    expect(custom.statusLabel).toBe('Занят');
    expect(AvatarDriver.mount().statusLabel).toBeUndefined();

    const russian = AvatarDriver.mount({
      props: { name: 'Alice', status: 'away' },
      config: { locale: 'ru-RU' },
    });

    expect(russian.statusLabel).toBe('Нет на месте');
  });
});

describe('NuiAvatarGroup', () => {
  it('stacks item avatars, collapses the rest into +N and shares size and shape', () => {
    const group = AvatarGroupDriver.mount({
      props: { items: PEOPLE, max: 3, size: 'lg', shape: 'square', label: 'Team' },
    });

    expect(group.attribute('role')).toBe('group');
    expect(group.attribute('aria-label')).toBe('Team');
    expect(group.avatars).toHaveLength(4);
    expect(group.overflowText).toBe('+2');
    expect(group.sizes).toEqual(Array.from({ length: 4 }, () => 'nui-avatar--size-lg'));
    expect(group.shapes).toEqual(Array.from({ length: 4 }, () => 'nui-avatar--shape-square'));
    expect(group.grouped).toBe(true);

    const all = AvatarGroupDriver.mount({ props: { items: PEOPLE } });
    expect(all.avatars).toHaveLength(5);
    expect(all.overflowText).toBeUndefined();
  });

  it('slices slotted avatars the same way and lets a child keep its own size', () => {
    const children = PEOPLE.map(({ name }) => ({ name }));

    const group = AvatarGroupDriver.mount({
      props: { max: 3, size: 'sm', overflowLabel: (count: number) => `ещё ${count}` },
      children: [...children.slice(0, 4), { name: 'Eve Park', size: 'xl' }],
    });

    expect(group.avatars).toHaveLength(4);
    expect(group.overflowText).toBe('ещё 2');
    expect(group.sizes).toEqual(Array.from({ length: 4 }, () => 'nui-avatar--size-sm'));

    const mixed = AvatarGroupDriver.mount({
      props: { size: 'sm' },
      children: [{ name: 'Alice' }, { name: 'Bob', size: 'xl' }],
    });

    expect(mixed.sizes).toEqual(['nui-avatar--size-sm', 'nui-avatar--size-xl']);
  });
});
