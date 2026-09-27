import { afterEach, describe, expect, it } from 'vitest';
import { HomeMosaicDriver } from './drivers/home-mosaic';

describe('DocsHomeMosaic', () => {
  let mosaic: HomeMosaicDriver | undefined;

  afterEach(() => {
    mosaic?.unmount();
    mosaic = undefined;
  });

  it('renders live kit parts with their own labels', async () => {
    mosaic = HomeMosaicDriver.mount();
    await mosaic.ready();
    expect(mosaic.nameLabel.text()).toBe('Название');
    expect(mosaic.nameLabel.attributes('for')).toBe(mosaic.nameInput.attributes('id'));
    expect(mosaic.switchLabel).toContain('Виден всей компании');
    expect(mosaic.progressValue).toBe(72);
    expect(mosaic.chips).toEqual(['Vue 3.5', 'SSR', 'RTL', 'Тёмная тема']);
  });

  it('switches the period in the segmented group', async () => {
    mosaic = HomeMosaicDriver.mount();
    await mosaic.ready();
    expect(mosaic.selectedPeriod).toBe('Месяц');
    await mosaic.pickPeriod('Год');
    expect(mosaic.selectedPeriod).toBe('Год');
  });
});
