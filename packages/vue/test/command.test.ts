import { describe, expect, it } from 'vite-plus/test';
import { CommandDriver } from './drivers/command';

describe('NuiCommand', () => {
  it('lists grouped commands with shortcuts and activates the first one for the keyboard', async () => {
    const command = CommandDriver.mount();
    await command.ready();
    expect(command.groupLabels).toEqual(['Navigation']);
    expect(command.labels).toEqual(['Home', 'Documentation', 'Toggle theme', 'Locked action']);
    expect(command.shortcutKeys).toEqual(['Ctrl', 'H']);
    expect(command.activeLabel).toBe('Home');
    expect(command.placeholder).toBe('Type a command or search…');
    expect(command.listLabel).toBe('Commands');
    expect(command.input.attributes('role')).toBe('combobox');
  });

  it('filters by label, description and keywords, keeps focus in the input and picks with Enter', async () => {
    const command = CommandDriver.mount({ props: { autofocus: true } });
    await command.ready();
    expect(command.focused).toBe(true);

    await command.type('dark');
    expect(command.labels).toEqual(['Toggle theme']);
    expect(command.searches).toEqual(['dark']);
    expect(command.activeLabel).toBe('Toggle theme');

    await command.type('guides');
    expect(command.labels).toEqual(['Documentation']);

    await command.press('Enter');
    expect(command.selections.map((item) => item.value)).toEqual(['docs']);

    await command.type('zzz');
    expect(command.labels).toEqual([]);
    expect(command.emptyText).toBe('No results');
    expect(command.activeLabel).toBeUndefined();
  });

  it('asks the browser for focus whenever the layer around it opens', () => {
    const asked = CommandDriver.mount({ props: { autofocus: true } });
    const plain = CommandDriver.mount();

    expect(asked.input.attributes('autofocus')).toBeDefined();
    expect(plain.input.attributes('autofocus')).toBeUndefined();
  });

  it('moves the active option with the arrows, on hover, and reports clicks', async () => {
    const command = CommandDriver.mount();
    await command.ready();
    await command.press('ArrowDown');
    expect(command.activeLabel).toBe('Documentation');

    await command.press('ArrowDown');
    expect(command.activeLabel).toBe('Toggle theme');

    await command.press('ArrowDown');
    expect(command.activeLabel).toBe('Home');

    await command.press('End');
    expect(command.activeLabel).toBe('Toggle theme');

    await command.hoverOption('Documentation');
    expect(command.activeLabel).toBe('Documentation');

    await command.clickOption('Home');
    expect(command.selections.map((item) => item.value)).toEqual(['home']);
  });

  it('marks the selected command, starts on it and keeps it until the app changes it', async () => {
    const command = CommandDriver.mount({ props: { selected: 'theme' } });
    await command.ready();
    expect(command.selectedLabels).toEqual(['Toggle theme']);
    expect(command.activeLabel).toBe('Toggle theme');

    await command.type('do');
    expect(command.activeLabel).toBe('Documentation');

    await command.clickOption('Documentation');
    expect(command.selections.map((item) => item.value)).toEqual(['docs']);
    expect(command.selectedLabels).toEqual([]);

    await command.type('');
    expect(command.selectedLabels).toEqual(['Toggle theme']);
    expect(command.activeLabel).toBe('Toggle theme');
  });

  it('leaves filtering to the app when filter is false and speaks the configured language', async () => {
    const remote = CommandDriver.mount({ props: { filter: false, loading: true } });
    await remote.ready();
    await remote.type('anything');
    expect(remote.labels).toEqual(['Home', 'Documentation', 'Toggle theme', 'Locked action']);
    expect(remote.hasModifier('loading')).toBe(true);

    const russian = CommandDriver.mount({ config: { locale: 'ru-RU' } });
    expect(russian.placeholder).toBe('Команда или поиск…');
    expect(russian.listLabel).toBe('Команды');

    const custom = CommandDriver.mount({ props: { placeholder: 'Go to…', label: 'Jump' } });
    expect(custom.placeholder).toBe('Go to…');
    expect(custom.listLabel).toBe('Jump');
  });
});
